// @ts-nocheck
// Z-Engine: Zero-Gravity Pre-Ignition + Intersection Observer Predictive Loader
// Layer 1: Predictive mousedown/touchstart (150ms before click completes)
// Layer 2: Intersection Observer (prefetch links 200px before they enter viewport)
(function() {
  var zPrefetch = new Set();
  function addPrefetch(href) {
    if (!zPrefetch.has(href)) {
      zPrefetch.add(href);
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.as = 'document';
      l.href = href;
      document.head.appendChild(l);
    }
  }

  // Layer 1: Predictive mousedown/touchstart
  function ignite(evt) {
    var t = evt.target;
    var a = t && t.closest ? t.closest('a') : null;
    if (a && a.href && a.href.startsWith(location.origin)) {
      addPrefetch(a.href);
    }
  }
  document.addEventListener('mousedown', ignite, { passive: true });
  document.addEventListener('touchstart', ignite, { passive: true });

  // Layer 2: Intersection Observer - prefetch links entering the viewport
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          var el = entries[i].target;
          var href = el.getAttribute('href') || el.href;
          if (href && href.startsWith && (href.startsWith('/') || href.startsWith(location.origin))) {
            var fullHref = href.startsWith('/') ? location.origin + href : href;
            addPrefetch(fullHref);
          }
          io.unobserve(el);
        }
      }
    }, { rootMargin: '200px' });

    // Observe after DOM is idle to avoid blocking the main thread
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function() {
        var links = document.querySelectorAll('a[href^="/"], a[href^="' + location.origin + '"]');
        for (var i = 0; i < links.length; i++) io.observe(links[i]);
      });
    } else {
      setTimeout(function() {
        var links = document.querySelectorAll('a[href^="/"], a[href^="' + location.origin + '"]');
        for (var i = 0; i < links.length; i++) io.observe(links[i]);
      }, 200);
    }
  }
})();
