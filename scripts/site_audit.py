#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


ROOT = Path(__file__).resolve().parents[1]


def norm_path(p: str) -> str:
    p = p.replace("\\", "/")
    return re.sub(r"/{2,}", "/", p)


def is_external(href: str) -> bool:
    return bool(re.match(r"^(https?:)?//", href)) or href.startswith("mailto:") or href.startswith("tel:")


def strip_fragment(href: str) -> Tuple[str, str]:
    if "#" in href:
        base, frag = href.split("#", 1)
        return base, frag
    return href, ""


@dataclass
class PageMeta:
    file: Path
    title: Optional[str] = None
    description: Optional[str] = None
    canonical: Optional[str] = None
    h1_count: int = 0
    ids: Set[str] = None  # type: ignore[assignment]
    images: List[Dict[str, str]] = None  # type: ignore[assignment]
    links: List[Tuple[str, int]] = None  # (href/src, line)


class AuditParser(HTMLParser):
    def __init__(self, page: PageMeta):
        super().__init__(convert_charrefs=True)
        self.page = page
        self._in_title = False
        self._title_buf: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]):
        attrs_d = {k: (v or "") for k, v in attrs}

        if tag == "title":
            self._in_title = True
            self._title_buf = []

        if tag == "meta":
            name = attrs_d.get("name", "").lower()
            prop = attrs_d.get("property", "").lower()
            if name == "description":
                self.page.description = attrs_d.get("content", "").strip() or self.page.description
            if prop == "og:url":
                # not strictly canonical but useful
                pass

        if tag == "link":
            rel = (attrs_d.get("rel", "") or "").lower()
            if rel == "canonical":
                self.page.canonical = attrs_d.get("href", "").strip() or self.page.canonical

        if tag == "h1":
            self.page.h1_count += 1

        if "id" in attrs_d and attrs_d["id"]:
            self.page.ids.add(attrs_d["id"])

        if tag == "img":
            self.page.images.append(
                {
                    "src": attrs_d.get("src", ""),
                    "alt": attrs_d.get("alt", ""),
                    "width": attrs_d.get("width", ""),
                    "height": attrs_d.get("height", ""),
                    "loading": attrs_d.get("loading", ""),
                }
            )

        if tag in ("a", "link", "script", "img"):
            attr = "href" if tag in ("a", "link") else "src"
            val = attrs_d.get(attr, "")
            if val:
                # line numbers: HTMLParser tracks current position
                line, _ = self.getpos()
                self.page.links.append((val, line))

    def handle_endtag(self, tag: str):
        if tag == "title":
            self._in_title = False
            t = "".join(self._title_buf).strip()
            if t:
                self.page.title = t

    def handle_data(self, data: str):
        if self._in_title:
            self._title_buf.append(data)


def iter_html_files() -> List[Path]:
    files = []
    for p in ROOT.rglob("*.html"):
        # skip obvious non-site directories
        posix = p.as_posix()
        if "/.git/" in posix:
            continue
        if "/node_modules/" in posix:
            continue
        if "/.playwright-screenshots/" in posix:
            continue
        if "/.screenshots/" in posix:
            continue
        files.append(p)
    return sorted(files)


def resolve_local_target(page_file: Path, href: str) -> Tuple[Optional[Path], str]:
    base, frag = strip_fragment(href)
    base = base.strip()
    if base == "":
        # purely fragment link on same page
        return page_file, frag

    if base.startswith("/"):
        target = ROOT / base.lstrip("/")
    else:
        target = (page_file.parent / base)
    target = Path(norm_path(str(target)))
    return target, frag


def check_link_target(target: Path) -> bool:
    # directory-like links should resolve to index.html
    if target.is_dir():
        return (target / "index.html").exists()
    if target.suffix == "":
        # treat as directory path without trailing slash
        if (target / "index.html").exists():
            return True
    return target.exists()


def main() -> int:
    pages: List[PageMeta] = []
    for f in iter_html_files():
        meta = PageMeta(file=f, ids=set(), images=[], links=[])
        html = f.read_text(encoding="utf-8", errors="replace")
        p = AuditParser(meta)
        p.feed(html)
        pages.append(meta)

    errors: List[str] = []
    warnings: List[str] = []

    # Title / description checks
    title_map: Dict[str, List[Path]] = {}
    desc_map: Dict[str, List[Path]] = {}
    for page in pages:
        if not page.title:
            errors.append(f"[TITLE] Missing <title>: {page.file.relative_to(ROOT)}")
        else:
            title_map.setdefault(page.title, []).append(page.file)

        if not page.description:
            warnings.append(f"[DESC] Missing meta description: {page.file.relative_to(ROOT)}")
        else:
            desc_map.setdefault(page.description, []).append(page.file)

        if page.h1_count != 1:
            warnings.append(f"[H1] Expected 1 <h1>, found {page.h1_count}: {page.file.relative_to(ROOT)}")

        if page.file.name != "404.html" and (not page.canonical):
            warnings.append(f"[CANON] Missing canonical: {page.file.relative_to(ROOT)}")

    for t, files in title_map.items():
        if len(files) > 1:
            warnings.append("[TITLE] Duplicate title: " + " | ".join(str(f.relative_to(ROOT)) for f in files))

    for d, files in desc_map.items():
        if len(files) > 1:
            warnings.append("[DESC] Duplicate description: " + " | ".join(str(f.relative_to(ROOT)) for f in files))

    # Image checks
    for page in pages:
        for img in page.images:
            src = img.get("src", "")
            if not src:
                warnings.append(f"[IMG] Missing src: {page.file.relative_to(ROOT)}")
                continue

            # local images should exist
            if not is_external(src) and not src.startswith("data:"):
                target, _ = resolve_local_target(page.file, src)
                if target and not check_link_target(target):
                    errors.append(f"[IMG] Broken src '{src}': {page.file.relative_to(ROOT)}")

            # alt attribute should exist (even if empty) for accessibility
            if img.get("alt", None) is None:
                warnings.append(f"[IMG] Missing alt attribute for '{src}': {page.file.relative_to(ROOT)}")

            # width/height strongly recommended to avoid CLS
            if (not img.get("width")) or (not img.get("height")):
                warnings.append(f"[IMG] Missing width/height for '{src}': {page.file.relative_to(ROOT)}")

    # Link checks (internal only)
    for page in pages:
        for href, line in page.links:
            if is_external(href) or href.startswith("data:"):
                continue

            target, frag = resolve_local_target(page.file, href)
            if not target:
                continue

            if target == page.file and frag:
                if frag not in page.ids:
                    warnings.append(
                        f"[ANCHOR] Missing id '#{frag}' (line {line}): {page.file.relative_to(ROOT)}"
                    )
                continue

            if not check_link_target(target):
                errors.append(
                    f"[LINK] Broken '{href}' (line {line}) -> '{target.relative_to(ROOT) if target.exists() else target}': {page.file.relative_to(ROOT)}"
                )

    # Output
    if errors:
        print("ERRORS:")
        for e in errors:
            print("  " + e)
    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print("  " + w)

    print(f"\nSUMMARY: {len(errors)} errors, {len(warnings)} warnings, {len(pages)} pages scanned.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

