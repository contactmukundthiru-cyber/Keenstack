(function () {
  'use strict';

  document.documentElement.classList.add('has-js');

  var prefersReducedMotion = false;
  try {
    prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    prefersReducedMotion = false;
  }

  // Navigation toggle
  var navToggle = document.querySelector('[data-nav-toggle]');
  var navLinks = document.querySelector('[data-nav-links]');
  var navbar = document.querySelector('.navbar');

  function isNavOpen() {
    return !!(navLinks && navLinks.classList.contains('open'));
  }

  function closeNav(options) {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    if (options && options.returnFocus) {
      navToggle.focus();
    }
  }

  function openNav() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    var firstLink = navLinks.querySelector('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (firstLink) {
      firstLink.focus();
    }
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      if (isNavOpen()) {
        closeNav({ returnFocus: true });
      } else {
        openNav();
      }
    });

    // Close menu when clicking a nav link (mobile UX)
    navLinks.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (link && isNavOpen()) {
        closeNav({ returnFocus: false });
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!isNavOpen()) return;
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        closeNav({ returnFocus: false });
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isNavOpen()) {
        closeNav({ returnFocus: true });
      }
    });
  }

  // Navbar scroll effect
  if (navbar) {
    window.addEventListener('scroll', function () {
      var currentScroll = window.pageYOffset;
      if (currentScroll > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // Set active navigation link
  if (navLinks) {
    var links = navLinks.querySelectorAll('a[href]');
    var currentPath = normalizePath(window.location.pathname);
    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.indexOf('#') === 0) return;
      try {
        var url = new URL(href, window.location.href);
        var linkPath = normalizePath(url.pathname);
        if (linkPath === currentPath) {
          link.setAttribute('aria-current', 'page');
        }
      } catch (e) {
        // ignore invalid URLs
      }
    });
  }

  function normalizePath(pathname) {
    var path = (pathname || '').replace(/index\.html$/, '');
    // Ensure trailing slash for directory-like paths (except root)
    if (path.length > 1 && path.charAt(path.length - 1) !== '/') {
      path = path + '/';
    }
    // Root should be "/"
    if (path === '') return '/';
    return path;
  }

  // FAQ accordion
  var faqItems = document.querySelectorAll('[data-faq-item]');
  faqItems.forEach(function (item, index) {
    var trigger = item.querySelector('[data-faq-trigger]');
    var answer = item.querySelector('.faq-answer');
    if (!trigger) return;

    // Prefer real buttons, but support legacy div triggers.
    var isButton = trigger.tagName && trigger.tagName.toLowerCase() === 'button';
    if (!isButton) {
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
    }

    // Wire up ARIA relationships when possible.
    if (answer) {
      if (!trigger.id) {
        trigger.id = 'faq-q-' + (index + 1);
      }
      if (!answer.id) {
        answer.id = 'faq-a-' + (index + 1);
      }
      trigger.setAttribute('aria-controls', answer.id);
      answer.setAttribute('role', 'region');
      answer.setAttribute('aria-labelledby', trigger.id);
    }

    function setFaqExpanded(isExpanded) {
      item.classList.toggle('active', isExpanded);
      trigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      if (answer) {
        answer.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
      }
    }

    // Initialize state
    setFaqExpanded(item.classList.contains('active'));

    var toggleFaq = function () {
      setFaqExpanded(!item.classList.contains('active'));
    };

    trigger.addEventListener('click', toggleFaq);
    if (!isButton) {
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFaq();
        }
      });
    }
  });

  // Smooth scroll for anchor links
  var smoothLinks = document.querySelectorAll('a[href^="#"]');
  smoothLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId.length < 2) return;
      var target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      
      // Close mobile menu if open
      if (isNavOpen()) {
        closeNav({ returnFocus: false });
      }

      var headerOffset = navbar ? (navbar.offsetHeight + 16) : 80;
      var elementPosition = target.getBoundingClientRect().top;
      var offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });

      // Move focus for keyboard / screen reader users
      try {
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }
        target.focus({ preventScroll: true });
      } catch (e) {
        // ignore
      }
    });
  });

  // Keep motion minimal to preserve readability and reduce jank.

  // Lazy load images
  if ('loading' in HTMLImageElement.prototype) {
    var images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(function (img) {
      img.addEventListener('load', function () {
        img.classList.add('loaded');
      });
      if (img.complete) {
        img.classList.add('loaded');
      }
    });
  } else if ('IntersectionObserver' in window) {
    // Fallback for browsers that don't support native lazy loading
    var imageObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.add('loaded');
          imageObserver.unobserve(img);
        }
      });
    });

    var lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(function (img) {
      imageObserver.observe(img);
    });
  } else {
    // Very old browsers: don't hide images; mark as loaded.
    var fallbackImages = document.querySelectorAll('img[loading="lazy"], img[data-src]');
    fallbackImages.forEach(function (img) {
      if (img.dataset && img.dataset.src) {
        img.src = img.dataset.src;
      }
      img.classList.add('loaded');
    });
  }

  // Form validation and handling
  var forms = document.querySelectorAll('form');
  forms.forEach(function (form) {
    var inputs = form.querySelectorAll('input, textarea, select');
    var statusEl = form.querySelector('[data-form-status]');
    
    inputs.forEach(function (input) {
      // Real-time validation feedback
      input.addEventListener('blur', function () {
        validateField(input);
      });
      
      input.addEventListener('input', function () {
        if (input.classList.contains('error')) {
          validateField(input);
        }
      });
    });

    form.addEventListener('submit', function (e) {
      var isValid = true;
      inputs.forEach(function (input) {
        if (!validateField(input)) {
          isValid = false;
        }
      });

      if (!isValid) {
        e.preventDefault();
        if (statusEl) {
          statusEl.classList.remove('success');
          statusEl.classList.add('error');
          statusEl.textContent = 'Please review the highlighted fields and try again.';
        }
        var firstError = form.querySelector('.error');
        if (firstError) {
          firstError.focus();
          firstError.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
        }
      } else {
        // If this is a static site and the form action is a placeholder, use mailto fallback.
        var action = (form.getAttribute('action') || '').trim();
        var mailtoFallback = (form.getAttribute('data-mailto-fallback') || '').trim();
        var isPlaceholderAction = !action || action === '#' || action.charAt(0) === '#';
        if (isPlaceholderAction && mailtoFallback) {
          e.preventDefault();
          if (statusEl) {
            statusEl.classList.remove('error');
            statusEl.classList.add('success');
            statusEl.textContent = 'Opening your email client to send the message…';
          }

          var payload = {};
          inputs.forEach(function (input) {
            var name = input.name || input.id;
            if (!name) return;
            payload[name] = (input.value || '').trim();
          });

          var subject = 'KeenStack inquiry';
          if (payload.name) subject += ' from ' + payload.name;

          var lines = [];
          if (payload.name) lines.push('Name: ' + payload.name);
          if (payload.email) lines.push('Email: ' + payload.email);
          if (payload.company) lines.push('Company: ' + payload.company);
          if (payload.interest) lines.push('Interest: ' + payload.interest);
          lines.push('');
          lines.push(payload.message ? payload.message : '(No message provided)');

          var mailto = 'mailto:' + encodeURIComponent(mailtoFallback) +
            '?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(lines.join('\n'));

          // Avoid keeping the form in a disabled "loading" state for mailto.
          var submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
          }

          window.location.href = mailto;
          return;
        }

        // Show loading state for real POST actions
        var submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.classList.add('loading');
          submitButton.disabled = true;
        }
      }
    });
  });

  function validateField(field) {
    var isValid = field.validity.valid;
    field.classList.toggle('error', !isValid);
    field.setAttribute('aria-invalid', isValid ? 'false' : 'true');
    
    // Remove existing error message
    var parent = field.parentElement;
    if (!parent) return isValid;

    var existingError = parent.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    if (field.hasAttribute('aria-describedby')) {
      field.removeAttribute('aria-describedby');
    }
    
    // Add error message if invalid
    if (!isValid && field.validationMessage) {
      var errorMsg = document.createElement('span');
      errorMsg.className = 'error-message';
      errorMsg.setAttribute('role', 'alert');
      errorMsg.setAttribute('aria-live', 'polite');
      var errorId = (field.id ? field.id : ('field-' + Math.random().toString(16).slice(2))) + '-error';
      errorMsg.id = errorId;
      errorMsg.textContent = field.validationMessage;
      parent.appendChild(errorMsg);
      field.setAttribute('aria-describedby', errorId);
    }
    
    return isValid;
  }

  // Add loading attribute to images below the fold
  document.addEventListener('DOMContentLoaded', function () {
    var images = document.querySelectorAll('img:not([loading])');
    if (!('IntersectionObserver' in window)) return;

    var imageObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          if (!img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
          }
          imageObserver.unobserve(img);
        }
      });
    }, { rootMargin: '50px' });

    images.forEach(function (img) {
      // Skip hero images
      if (!img.closest('.hero')) {
        imageObserver.observe(img);
      }
    });
  });

  // Keyboard navigation improvements
  document.addEventListener('keydown', function (e) {
    // Skip to main content with Alt+M
    if (e.altKey && e.key === 'm') {
      var main = document.querySelector('main');
      if (main) {
        e.preventDefault();
        main.focus();
        main.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
    }
  });

  // Make main focusable for keyboard navigation
  var main = document.querySelector('main');
  if (main && !main.hasAttribute('tabindex')) {
    main.setAttribute('tabindex', '-1');
  }
})();
