(function () {
  var navToggle = document.querySelector('[data-nav-toggle]');
  var navLinks = document.querySelector('[data-nav-links]');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
  }

  if (navLinks) {
    var links = navLinks.querySelectorAll('a[href]');
    var currentPath = window.location.pathname.replace(/index\.html$/, '');
    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.indexOf('#') === 0) return;
      var url = new URL(href, window.location.origin + window.location.pathname);
      var linkPath = url.pathname.replace(/index\.html$/, '');
      if (linkPath === currentPath) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  var faqItems = document.querySelectorAll('[data-faq-item]');
  faqItems.forEach(function (item) {
    var trigger = item.querySelector('[data-faq-trigger]');
    if (!trigger) return;
    trigger.addEventListener('click', function () {
      item.classList.toggle('active');
    });
  });

  var smoothLinks = document.querySelectorAll('a[href^="#"]');
  smoothLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId.length < 2) return;
      var target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
