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
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0.05 });
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

  /* ---- Home stage: Byte's pose, mood and line, plus the backdrop, follow the scene ---- */
  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
  var mascot = document.querySelector('.mascot');
  var say = mascot && mascot.querySelector('.say');
  var backdrops = Array.prototype.slice.call(document.querySelectorAll('.stage .bg'));
  var currentScene = null;
  var homeFooter = scenes.length && document.querySelector('.footer');
  if (homeFooter) {
    homeFooter.setAttribute('data-scene', 'footer');
    homeFooter.setAttribute('data-pose', 'away');
    scenes.push(homeFooter);
  }

  function setScene(sc) {
    if (sc === currentScene) return;
    currentScene = sc;
    var key = sc.getAttribute('data-scene');
    // The footer keeps whatever backdrop the last scene had; only Byte steps aside.
    // Scenes without their own backdrop (the light finale, the footer) keep the last one.
    if (document.querySelector('.stage .bg[data-for="' + key + '"]')) backdrops.forEach(function (bg) { bg.classList.toggle('on', bg.getAttribute('data-for') === key); });
    if (!mascot) return;
    mascot.setAttribute('data-pose', sc.getAttribute('data-pose') || 'away');
    mascot.setAttribute('data-mood', sc.getAttribute('data-mood') || 'normal');
    if (say) {
      // Byte travels to his new spot first, then speaks.
      say.classList.add('hide');
      say.textContent = sc.getAttribute('data-say') || '';
      sceneChangedAt = Date.now();
    }
    fitByte();
    if (say && say.textContent) placeSaySoon(travelLeft());
  }

  /* Byte's spot per pose, as fractions of the viewport: [x, y, scale, anchor].
     'bottom' keeps his feet in place when he has to shrink; 'center' keeps his middle. */
  var POSES = {
    wide: {
      hero: [.73, .54, 1.25, 'center'], listen: [.88, .80, .42, 'bottom'], problem: [.78, .55, .95, 'center'],
      guide: [.50, .76, .95, 'bottom'], plan: [.88, .80, .42, 'bottom'], voices: [.88, .78, .45, 'bottom'],
      next: [.50, .78, .9, 'bottom']
    },
    narrow: {
      hero: [.50, .78, .78, 'bottom'], listen: [.82, .86, .3, 'bottom'],
      guide: [.50, .76, .75, 'bottom'], plan: [.82, .86, .3, 'bottom'], voices: [.82, .86, .3, 'bottom'],
      next: [.50, .78, .72, 'bottom']
    }
  };
  var SHRINK = [1, .88, .76, .66, .57, .5, .43];
  var lastFit = '';
  var fitTimer = null;

  // The robot's visible box (inside the 300px stage) at centre (cx, cy) and scale s,
  // including his antenna and the height of his floating bob.
  function robotBox(cx, cy, s) {
    return { left: cx - 138 * s, right: cx + 138 * s, top: cy - 141 * s - 14 * s, bottom: cy + 108 * s };
  }

  // On-screen things Byte and his bubble must not cover. Text is measured line
  // by line, so a short heading in a full-width block only blocks its words.
  var TEXT_TAGS = /^(H1|H2|H3|P|LI|FIGURE)$/;
  function obstacles() {
    var out = [];
    var els = document.querySelectorAll(SAY_OBSTACLES);
    var range = document.createRange();
    for (var i = 0; i < els.length; i++) {
      var rects = [els[i].getBoundingClientRect()];
      if (TEXT_TAGS.test(els[i].tagName)) {
        range.selectNodeContents(els[i]);
        rects = range.getClientRects();
      }
      for (var k = 0; k < rects.length; k++) {
        var b = rects[k];
        if (b.width && b.height && b.bottom > 0 && b.top < window.innerHeight) out.push(b);
      }
    }
    return out;
  }

  function fitByte() {
    fitTimer = null;
    if (!mascot || !currentScene) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var p = (vw > 900 ? POSES.wide : POSES.narrow)[currentScene.getAttribute('data-pose')];
    var nav = document.querySelector('.nav');
    var navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
    var fit = null;
    if (p) {
      var cx = p[0] * vw, cy0 = p[1] * vh, s0 = p[2];
      var feet = Math.min(robotBox(cx, cy0, s0).bottom, vh - 8);
      var blocks = obstacles();
      for (var i = 0; i < SHRINK.length && !fit; i++) {
        var s = s0 * SHRINK[i];
        if (s * 300 < 72) break;
        var cy = p[3] === 'bottom' ? feet - 108 * s : cy0;
        var r = robotBox(cx, cy, s);
        if (r.left < 4 || r.right > vw - 4 || r.top < navBottom + 6 || r.bottom > vh - 4) continue;
        var clear = true;
        for (var j = 0; j < blocks.length && clear; j++) if (overlaps(r, blocks[j], 10)) clear = false;
        if (clear) fit = { x: cx - 150, y: cy - 150, s: s };
      }
    }
    applyFit(fit);
  }

  // Byte never glides across the page (he'd pass over text on the way):
  // he fades out, moves, then pops back in at his new spot.
  var moveTimer = null;
  var lastBox = null;
  function applyFit(fit) {
    var key = fit ? [Math.round(fit.x), Math.round(fit.y), fit.s.toFixed(2)].join() : 'away';
    if (key === lastFit) return;
    var wasShown = lastFit && lastFit !== 'away';
    lastFit = key;
    clearTimeout(moveTimer);
    moveTimer = null;
    if (say) say.classList.add('hide');
    if (!fit) {
      // Nowhere clear to stand in this scene: Byte steps out of view.
      lastBox = null;
      mascot.style.setProperty('--o', '0');
      return;
    }
    function arrive() {
      // The page may have moved since the spot was chosen: if it is no longer
      // clear, stay out of view and look again once scrolling settles.
      var box = robotBox(fit.x + 150, fit.y + 150, fit.s);
      var blocks = obstacles();
      for (var j = 0; j < blocks.length; j++) {
        if (overlaps(box, blocks[j], 2)) {
          lastFit = 'away'; lastBox = null;
          mascot.style.setProperty('--o', '0');
          fitByteSoon();
          return;
        }
      }
      mascot.style.setProperty('--x', fit.x.toFixed(1) + 'px');
      mascot.style.setProperty('--y', fit.y.toFixed(1) + 'px');
      mascot.style.setProperty('--s', fit.s.toFixed(3));
      lastBox = robotBox(fit.x + 150, fit.y + 150, fit.s);
      mascot.classList.remove('arrive');
      void mascot.offsetWidth;
      mascot.classList.add('arrive');
      mascot.style.setProperty('--o', '1');
      sceneChangedAt = Date.now();
      if (say && say.textContent) placeSaySoon(travelLeft());
    }
    if (wasShown && !reduceMotion) {
      mascot.style.setProperty('--o', '0');
      moveTimer = setTimeout(function () { moveTimer = null; arrive(); }, 160);
    } else {
      arrive();
    }
  }

  // After scrolling settles, only move Byte if something now covers his spot
  // (or he stepped away and there may be room again). No restless re-fitting.
  function checkByte() {
    fitTimer = null;
    if (!mascot || !currentScene) return;
    if (!lastBox) { fitByte(); return; }
    var blocks = obstacles();
    for (var j = 0; j < blocks.length; j++) {
      if (overlaps(lastBox, blocks[j], 4)) { lastFit = lastFit + '!'; fitByte(); return; }
    }
  }

  function fitByteSoon() {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(checkByte, 160);
  }

  // Phones resize the viewport when the address bar slides in and out; ignore
  // those small height changes so Byte doesn't hop around while you scroll.
  var lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', function () {
    var w = window.innerWidth, h = window.innerHeight;
    if (w === lastW && Math.abs(h - lastH) < 150) return;
    lastW = w; lastH = h;
    lastFit = '';
    fitByte();
  });

  /* Speech bubble placement: try above, left, right, then below Byte, and
     use the first spot that is fully on screen and clear of any text,
     buttons or cards. If none is clear, Byte stays quiet. */
  var SAY_SPOTS = ['top', 'left', 'right', 'bottom'];
  var SAY_OBSTACLES = 'main h1, main h2, main h3, main p, main .btn, main li:not(.pin-step), main .pin-step.on, main .ba, main .path, main .quote-item.on, main .quote-dots button, main .scroll-cue, .home .footer';
  var sayTimer = null;
  var sceneChangedAt = 0;

  // Time until Byte finishes moving to his current spot (at least a short pause).
  function travelLeft() {
    return reduceMotion ? 50 : Math.max(120, 520 - (Date.now() - sceneChangedAt));
  }

  function overlaps(a, b, pad) {
    return a.left < b.right + pad && b.left < a.right + pad && a.top < b.bottom + pad && b.top < a.bottom + pad;
  }

  function sayBlocked() {
    var r = say.getBoundingClientRect();
    var nav = document.querySelector('.nav');
    var top = nav ? nav.getBoundingClientRect().bottom : 0;
    if (r.left < 8 || r.right > window.innerWidth - 8 || r.top < top + 8 || r.bottom > window.innerHeight - 8) return true;
    var blocks = obstacles();
    for (var i = 0; i < blocks.length; i++) if (overlaps(r, blocks[i], 6)) return true;
    return false;
  }

  function placeSay() {
    sayTimer = null;
    if (!say || !say.textContent || getComputedStyle(say).display === 'none') return;
    if (lastFit === 'away') { say.classList.add('hide'); return; }
    for (var i = 0; i < SAY_SPOTS.length; i++) {
      say.setAttribute('data-at', SAY_SPOTS[i]);
      if (!sayBlocked()) {
        if (say.classList.contains('hide')) {
          say.classList.remove('hide', 'pop');
          void say.offsetWidth;
          say.classList.add('pop');
        }
        return;
      }
    }
    say.classList.add('hide');
  }

  function placeSaySoon(delay) {
    if (!say) return;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(placeSay, delay);
  }

  /* ---- Scroll-driven state: reading progress, active chapter, journey line ---- */
  var progress = document.querySelector('.progress');
  var dock = document.querySelector('.dock');
  var journeys = Array.prototype.slice.call(document.querySelectorAll('.journey'));
  var ticking = false;

  function update() {
    ticking = false;
    var scrollY = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;

    var read = max > 0 ? Math.min(scrollY / max, 1).toFixed(4) : 0;
    if (progress) progress.style.setProperty('--read', read);
    if (dock) dock.style.setProperty('--read', read);

    if (scenes.length) {
      var activeScene = scenes[0];
      scenes.forEach(function (sc) {
        if (sc.getBoundingClientRect().top < vh * (sc === homeFooter ? 0.92 : 0.5)) activeScene = sc;
      });
      setScene(activeScene);
      // Text scrolling into Byte's spot: he steps aside right away instead of being
      // covered, and comes back (refitted) once scrolling settles.
      if (lastBox && !moveTimer) {
        var blocks = obstacles();
        for (var b = 0; b < blocks.length; b++) {
          if (overlaps(lastBox, blocks[b], 2)) {
            lastBox = null; lastFit = 'away';
            mascot.style.setProperty('--o', '0');
            if (say) say.classList.add('hide');
            break;
          }
        }
      }
      fitByteSoon();
      // Content scrolling under the bubble: step aside, re-place once scrolling settles.
      if (say && say.textContent) {
        if (!say.classList.contains('hide') && sayBlocked()) say.classList.add('hide');
        if (say.classList.contains('hide')) placeSaySoon(travelLeft());
      }
    }

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
      var sticky = pin.querySelector('.pin-sticky');
      if (sticky && getComputedStyle(sticky).position !== 'sticky') {
        // Phones: a plain list, every step shown.
        for (var k = 0; k < steps.length; k++) steps[k].classList.add('on');
        return;
      }
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
