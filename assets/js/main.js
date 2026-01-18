(function () {
  'use strict';

  document.documentElement.classList.add('has-js');

  // Navigation toggle
  var navToggle = document.querySelector('[data-nav-toggle]');
  var navLinks = document.querySelector('[data-nav-links]');
  var navbar = document.querySelector('.navbar');
  
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      
      // Close menu when clicking outside
      if (isOpen) {
        document.addEventListener('click', function closeMenu(e) {
          if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
            navLinks.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', closeMenu);
          }
        });
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });
  }

  // Navbar scroll effect
  if (navbar) {
    var lastScroll = 0;
    window.addEventListener('scroll', function () {
      var currentScroll = window.pageYOffset;
      if (currentScroll > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      lastScroll = currentScroll;
    });
  }

  // Set active navigation link
  if (navLinks) {
    var links = navLinks.querySelectorAll('a[href]');
    var currentPath = window.location.pathname.replace(/index\.html$/, '');
    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href.indexOf('#') === 0) return;
      var url = new URL(href, window.location.origin + window.location.pathname);
      var linkPath = url.pathname.replace(/index\.html$/, '');
      if (linkPath === currentPath || (currentPath === '/' && linkPath === '')) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // FAQ accordion
  var faqItems = document.querySelectorAll('[data-faq-item]');
  faqItems.forEach(function (item) {
    var trigger = item.querySelector('[data-faq-trigger]');
    if (!trigger) return;
    
    // Make trigger keyboard accessible
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('aria-expanded', 'false');
    
    var toggleFaq = function () {
      var isActive = item.classList.toggle('active');
      trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    };
    
    trigger.addEventListener('click', toggleFaq);
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFaq();
      }
    });
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
      if (navLinks && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
      
      var headerOffset = 80;
      var elementPosition = target.getBoundingClientRect().top;
      var offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
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
  } else {
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
  }

  // Form validation and handling
  var forms = document.querySelectorAll('form');
  forms.forEach(function (form) {
    var inputs = form.querySelectorAll('input, textarea, select');
    
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
        var firstError = form.querySelector('.error');
        if (firstError) {
          firstError.focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Show loading state
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
    
    // Remove existing error message
    var existingError = field.parentElement.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // Add error message if invalid
    if (!isValid && field.validationMessage) {
      var errorMsg = document.createElement('span');
      errorMsg.className = 'error-message';
      errorMsg.textContent = field.validationMessage;
      errorMsg.style.cssText = 'display: block; color: #e74c3c; font-size: 0.85rem; margin-top: 4px;';
      field.parentElement.appendChild(errorMsg);
    }
    
    return isValid;
  }

  // Add loading attribute to images below the fold
  document.addEventListener('DOMContentLoaded', function () {
    var images = document.querySelectorAll('img:not([loading])');
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
        main.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // Make main focusable for keyboard navigation
  var main = document.querySelector('main');
  if (main && !main.hasAttribute('tabindex')) {
    main.setAttribute('tabindex', '-1');
  }
})();
