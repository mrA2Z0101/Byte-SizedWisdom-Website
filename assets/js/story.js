/* Byte-Sized Wisdom — storytelling interactions.
   Progressive enhancement only: every page reads fine without this file. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Mobile menu ---- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { revealer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- Chapter rail: built from [data-chapter] sections ---- */
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
  var railLinks = [];
  if (chapters.length > 2) {
    var rail = document.createElement('ol');
    rail.className = 'rail';
    rail.setAttribute('aria-label', 'Chapters');
    chapters.forEach(function (ch) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + ch.id;
      a.innerHTML = '<span>' + ch.getAttribute('data-chapter') + '</span>';
      a.setAttribute('aria-label', ch.getAttribute('data-chapter'));
      li.appendChild(a);
      rail.appendChild(li);
      railLinks.push(a);
    });
    document.body.appendChild(rail);
  }

  /* ---- Lit statements: split into words that light up as you scroll ---- */
  var lits = Array.prototype.slice.call(document.querySelectorAll('.lit'));
  lits.forEach(function (el) {
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      var hl = node.nodeType === 1 && node.classList.contains('hl');
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = hl ? 'w hl' : 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
    });
    el.textContent = '';
    el.appendChild(frag);
    el._words = el.querySelectorAll('.w');
  });

  /* ---- Pinned steps ---- */
  var pins = Array.prototype.slice.call(document.querySelectorAll('.pin'));
  pins.forEach(function (pin) {
    pin.style.setProperty('--n', pin.querySelectorAll('.pin-step').length);
  });

  /* ---- Scroll-driven state: reading progress, active chapter, journey line ---- */
  var progress = document.querySelector('.progress');
  var journeys = Array.prototype.slice.call(document.querySelectorAll('.journey'));
  var ticking = false;

  function update() {
    ticking = false;
    var scrollY = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;

    if (progress) progress.style.setProperty('--read', max > 0 ? Math.min(scrollY / max, 1).toFixed(4) : 0);

    if (railLinks.length) {
      var active = 0;
      chapters.forEach(function (ch, i) {
        if (ch.getBoundingClientRect().top < vh * 0.45) active = i;
      });
      railLinks.forEach(function (a, i) { a.classList.toggle('active', i === active); });
    }

    lits.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.5)));
      var on = reduceMotion ? el._words.length : Math.round(p * el._words.length);
      for (var i = 0; i < el._words.length; i++) el._words[i].classList.toggle('on', i < on);
    });

    pins.forEach(function (pin) {
      var steps = pin.querySelectorAll('.pin-step');
      var dial = pin.querySelectorAll('.pin-dial li');
      var r = pin.getBoundingClientRect();
      var span = pin.offsetHeight - vh;
      var p = span > 0 ? Math.max(0, Math.min(1, -r.top / span)) : 0;
      var idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
      for (var i = 0; i < steps.length; i++) {
        steps[i].classList.toggle('on', i === idx);
        if (dial[i]) {
          dial[i].classList.toggle('on', i === idx);
          dial[i].classList.toggle('done', i < idx);
        }
      }
      var bar = pin.querySelector('.pin-bar');
      if (bar) bar.style.setProperty('--p', ((idx + 1) / steps.length).toFixed(3));
    });

    journeys.forEach(function (j) {
      var r = j.getBoundingClientRect();
      var fill = Math.max(0, Math.min(1, (vh * 0.6 - r.top) / r.height));
      j.style.setProperty('--fill', fill.toFixed(4));
      j.querySelectorAll('.step').forEach(function (step) {
        step.classList.toggle('lit', step.getBoundingClientRect().top < vh * 0.6);
      });
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* ---- Rotating testimonials ---- */
  document.querySelectorAll('.quote-stage').forEach(function (stage) {
    var items = stage.querySelectorAll('.quote-item');
    var dots = document.createElement('div');
    dots.className = 'quote-dots';
    var current = 0;
    var timer;
    function show(n) {
      current = n;
      items.forEach(function (it, i) { it.classList.toggle('on', i === n); it.setAttribute('aria-hidden', String(i !== n)); });
      dots.querySelectorAll('button').forEach(function (d, i) { d.setAttribute('aria-current', String(i === n)); });
    }
    function play() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { show((current + 1) % items.length); }, 6000);
    }
    items.forEach(function (_, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Show quote ' + (i + 1));
      d.addEventListener('click', function () { show(i); play(); });
      dots.appendChild(d);
    });
    stage.parentNode.insertBefore(dots, stage.nextSibling);
    show(0);
    play();
  });

  /* ---- Pricing filter ---- */
  var filterBar = document.querySelector('[data-filter-bar]');
  if (filterBar) {
    var items = document.querySelectorAll('[data-cat]');
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      var f = btn.getAttribute('data-filter');
      filterBar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      items.forEach(function (it) { it.hidden = f !== 'all' && it.getAttribute('data-cat') !== f; });
    });
  }

  /* ---- Legacy deep links: services.html?id=logo -> #logo ---- */
  var params = new URLSearchParams(window.location.search);
  var legacyId = params.get('id');
  if (legacyId && document.getElementById(legacyId)) {
    history.replaceState(null, '', window.location.pathname + '#' + legacyId);
    document.getElementById(legacyId).scrollIntoView();
  }

  /* ---- Footer year ---- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
