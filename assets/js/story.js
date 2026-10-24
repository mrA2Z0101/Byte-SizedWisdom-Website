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
