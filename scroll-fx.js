// Byte-Sized Wisdom — scroll animation layer. The site reads and works without this file: it only adds motion.
//
//   1. trail     Byte rides a progress line under the nav as you scroll, and comments on each section
//   2. voyage    scroll to fly (home page): the hero pins, Byte takes off and the two disciplines drift past as stops
//   3. chapters  three streaks shoot in from the screen edge to each section label, once, when it comes into view
//   4. reveals   headings and cards rise in once, as their section arrives
//
// The app (bundle.js) is a single-page React build that scrolls inside #bsw-root and swaps <main> on navigation, so
// everything here watches for the page changing and sets itself up again. It marks the app's elements with data-
// attributes only and never changes their classes. With "reduce motion" on, nothing is pinned, hidden or moved.
(function () {
  "use strict";
  if (window.__bswFx) return;
  window.__bswFx = true;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasIO = "IntersectionObserver" in window;
  const canStick = !!(window.CSS && CSS.supports && CSS.supports("position", "sticky"));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => t * t * (3 - 2 * t);
  const mod = (a, n) => ((a % n) + n) % n;
  const make = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
  const scroller = () => document.getElementById("bsw-root");
  const toTop = () => { const r = scroller(); if (r) r.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); };

  // ---------------------------------------------------------------------------------------------------------------
  // Byte, the mascot: the robot from the site's logo, drawn from the same blocks in the same colours, so the one in
  // the nav and the one that flies are plainly the same character. Only the pupils and the antenna tip ever move.
  function byteSvg() {
    return '<svg class="fx-bot" viewBox="280 24.5 120 120" aria-hidden="true" focusable="false">' +
      '<rect class="fx-bulb" x="335" y="40" width="10" height="10" fill="#00788e"/>' +
      '<rect x="332" y="50" width="16" height="15" fill="#009ab2"/><rect x="332" y="50" width="16" height="3" fill="#00c8e0"/>' +
      '<rect x="284" y="65" width="112" height="64" fill="#00adc0"/><rect x="284" y="65" width="112" height="4" fill="#00cce0"/>' +
      '<rect x="300" y="97" width="16" height="16" fill="#040f12"/><rect x="364" y="97" width="16" height="16" fill="#040f12"/>' +
      '<g class="fx-look"><g class="fx-eyes">' +
      '<rect x="303" y="100" width="10" height="10" fill="#5ce0f8"/><rect x="367" y="100" width="10" height="10" fill="#5ce0f8"/>' +
      '<rect x="306" y="103" width="4" height="4" fill="#c8f8ff"/><rect x="370" y="103" width="4" height="4" fill="#c8f8ff"/></g></g></svg>';
  }

  // speech bubbles: one helper for the hero bubble and the trail bubble
  function bubbler(el) {
    let timer = 0;
    return {
      el,
      say(text, ms) {
        el.textContent = text;
        el.classList.add("is-on");
        clearTimeout(timer);
        timer = setTimeout(() => el.classList.remove("is-on"), ms || 2600);
      },
      hush() { clearTimeout(timer); el.classList.remove("is-on"); },
    };
  }

  // what Byte says as each section reaches the middle of the screen, keyed by the section's own label
  const SAY = {
    "what we do": "Brand and AI. We do both.",
    "our process": "Strategy first. Always.",
    "why choose us": "No middleman. Just us.",
    "by the numbers": "I counted these myself.",
    "work": "Real builds. Honest labels.",
    "how it works": "Five steps. Zero surprises.",
    "brand identity": "How the world sees you.",
    "ai integration": "How your business runs.",
    "testimonials": "They said it, not me.",
    "ready to start": "Your turn!",
    "the background": "Part designer. Part engineer.",
    "values": "We mean these.",
    "packages": "No surprise invoices.",
    "à la carte": "Or pick just the one.",
  };
  const FOOTER_SAY = "End of the line. Click me for the top.";

  // ---------------------------------------------------------------------------------------------------------------
  // 1. the trail: Byte as scroll progress, under the nav on every page
  const trail = (function () {
    const el = make("div", "fx-trail",
      '<span class="fx-trail__line" aria-hidden="true"></span>' +
      '<button class="fx-trail__bot" type="button" aria-label="Back to top">' + byteSvg() + "</button>" +
      '<p class="fx-bubble fx-trail__bubble" aria-hidden="true"></p>');
    document.body.appendChild(el);
    const btn = $(".fx-trail__bot", el), bub = bubbler($(".fx-trail__bubble", el));
    let p = 0;
    const place = () => {
      const W = el.offsetWidth, bw = bub.el.offsetWidth || 180;
      const cx = p * (W - btn.offsetWidth) + btn.offsetWidth * 0.5;
      bub.el.style.left = clamp(cx - bw / 2, 12, Math.max(12, W - bw - 12)) + "px";
    };
    const say = (text, ms) => {
      if (!el.classList.contains("is-on")) return;
      bub.say(text, ms || 3000); place();
    };
    btn.addEventListener("click", () => { say(p > 0.6 ? "Long way up. Hold on." : "Going up.", 1600); toTop(); });
    return {
      say,
      hush: () => bub.hush(),
      set(progress, on, navBottom, covered) {
        p = progress;
        el.style.setProperty("--p", p.toFixed(4));
        el.style.setProperty("--fx-nav", navBottom + "px");
        el.classList.toggle("is-on", on);
        el.classList.toggle("is-done", p > 0.995);
        el.classList.toggle("is-covered", covered);
        if (!on) bub.hush();
        else if (bub.el.classList.contains("is-on")) place();
      },
    };
  })();

  // ---------------------------------------------------------------------------------------------------------------
  // page state
  let hero0 = null;          // the first <section> of the page we are set up for
  let page = null;           // its parent: the page wrapper inside <main>
  let zones = [];            // sections (and the footer) Byte can comment on
  let said = new WeakSet();
  let voyage = null;
  let plainHome = false;     // home page without the voyage (reduced motion): the trail waits for a little scroll
  let ticking = false;
  const seen = new WeakSet();  // elements already considered for a reveal or a chapter streak

  const labelOf = (sec) => {
    const el = $("span.syne", sec) || $("h1, h2", sec) || $("p.syne", sec);
    return el ? el.textContent.trim().toLowerCase() : "";
  };

  function update() {
    ticking = false;
    const r = scroller();
    if (!r) return;
    const y = r.scrollTop, max = r.scrollHeight - r.clientHeight;
    const p = max > 4 ? clamp(y / max, 0, 1) : 0;
    const nav = $("nav", r);
    const navBottom = nav ? Math.max(0, Math.round(nav.getBoundingClientRect().bottom)) : 0;
    const on = voyage ? voyage.away() : plainHome ? y > 60 : max > 4;
    // an open mobile menu hangs over the spot where the trail runs: step aside for it
    let covered = false;
    if (on && nav) {
      const hit = document.elementFromPoint(r.clientWidth * 0.5, navBottom + 8);
      covered = !!hit && nav.contains(hit);
    }
    trail.set(p, on, navBottom, covered);
    const mid = r.clientHeight * 0.5;
    let cur = null;
    for (const z of zones) { const b = z.getBoundingClientRect(); if (b.top < mid && b.bottom > mid) cur = z; }
    if (cur && cur.dataset.fxSay && !said.has(cur)) { said.add(cur); trail.say(cur.dataset.fxSay, 3400); }
  }
  const requestUpdate = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };

  // ---------------------------------------------------------------------------------------------------------------
  // 3 + 4. chapter streaks and reveals
  const show = (el, delay) => {
    el.style.setProperty("--fx-d", delay + "ms");
    el.setAttribute("data-fx-r", "1");
    setTimeout(() => { el.removeAttribute("data-fx-r"); el.style.removeProperty("--fx-d"); }, 700 + delay);
  };
  const io = hasIO ? new IntersectionObserver((entries) => {
    const batch = [];
    entries.forEach((en) => {
      const el = en.target;
      if (!en.isIntersecting && en.boundingClientRect.bottom > 0) return;   // still below the fold: wait for it
      io.unobserve(el);
      if (el.hasAttribute("data-fx-ch")) el.setAttribute("data-fx-ch", "1");
      if (el.getAttribute("data-fx-r") === "0") {
        if (en.isIntersecting) batch.push({ el, b: en.boundingClientRect });
        else el.removeAttribute("data-fx-r");   // already scrolled past (or not displayed): no show, just be there
      }
    });
    // whatever arrives together rises in reading order, a beat apart
    batch.sort((a, b) => (Math.abs(a.b.top - b.b.top) > 24 ? a.b.top - b.b.top : a.b.left - b.b.left));
    batch.forEach((it, i) => show(it.el, Math.min(i, 5) * 60));
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;

  const pillOf = (sec) => {
    const s = $("span.syne", sec), p = s && s.parentElement;
    return p && p.children.length === 2 && getComputedStyle(p).display === "inline-flex" ? p : null;
  };
  const gutter = (pill) => {
    const r = scroller(), left = pill.getBoundingClientRect().left - (r ? r.getBoundingClientRect().left : 0);
    pill.style.setProperty("--fx-gut", Math.max(0, Math.round(left - 12)) + "px");
  };
  function chapter(pill, sec) {
    // only labels that sit at the left of their section: a centred label has nothing to point back to
    // (and on a phone the gutter is too thin for streaks to read as anything)
    const r = scroller(), left = pill.getBoundingClientRect().left - (r ? r.getBoundingClientRect().left : 0);
    if (getComputedStyle(pill.parentElement).textAlign === "center" || left < 48) return;
    gutter(pill);
    pill.setAttribute("data-fx-ch", reduce || !io ? "1" : "0");
    if (!reduce && io) io.observe(pill);
  }

  const selfAnimated = (el) => el.style.opacity !== "" || /\bfade-(up|in)\b/.test(el.className || "");
  function revealable(el) {
    for (let a = el; a && a.tagName !== "SECTION"; a = a.parentElement) {
      if (selfAnimated(a)) return false;                                  // the app already animates this one, or the block it sits in
    }
    if (el.closest("[data-fx-r]") || $("[data-fx-r]", el)) return false;  // never nest two reveals
    return !$$("[style*='opacity']", el).some((d) => d.style.opacity !== "" && /opacity/.test(d.style.transition));
  }
  function tag(el) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    if (!revealable(el)) return;
    el.setAttribute("data-fx-r", "0");
    io.observe(el);
  }

  function decorate() {
    if (!page) return;
    $$("section", page).forEach((sec, i) => {
      const pill = pillOf(sec);
      if (pill && !seen.has(pill)) {
        chapter(pill, sec);
        if (i === 0 || reduce || !io) seen.add(pill);   // otherwise the reveal pass below still gets a look at it
      }
      if (i === 0 || reduce || !io) return;             // each page's hero already animates itself on load
      // cards first, then looser grid cells, then the heading group around them
      $$(".card", sec).forEach(tag);
      $$(".col-2 > *, .col-3 > *, .col-4 > *", sec).forEach((cell) => {
        if (seen.has(cell) || cell.matches(".card") || $("h1, h2", cell)) return;
        const cs = getComputedStyle(cell);
        if (cs.display === "flex" && cs.flexDirection === "column" && cell.children.length > 1) { seen.add(cell); [...cell.children].forEach(tag); }
        else tag(cell);
      });
      // the small title row that sits on top of a group of cards comes in with them
      new Set($$("[data-fx-r]", sec).map((c) => c.parentElement)).forEach((group) => {
        const head = group.previousElementSibling;
        if (head && !head.matches("h1, h2") && head.offsetHeight < 90) tag(head);
      });
      if (pill) tag(pill);
      $$("h2", sec).forEach((h) => {
        tag(h);
        let sib = h.nextElementSibling;
        while (sib) { if (sib.matches("p, div")) tag(sib); sib = sib.nextElementSibling; }
      });
    });
  }

  // ---------------------------------------------------------------------------------------------------------------
  // 2. scroll to fly. The home hero pins under the nav for a few screens of scrolling. Byte lifts off the code
  //    window, grows to flying size, and the two disciplines drift past him as stops, each pausing beside him before
  //    it leaves. Scroll faster and the star streaks stretch. It is ordinary scrolling the whole way: nothing is
  //    hijacked. When the run ends he flies off and comes back as the trail under the nav, and the next section
  //    rises over the empty sky like a curtain.
  function makeVoyage(hero) {
    const r = scroller(), pageEl = hero.parentElement;
    const inner = [...hero.children].find((c) => c.matches(".col-2")) || hero.lastElementChild;
    const names = (sel) => $$(sel, pageEl).map((n) => n.textContent.trim()).filter(Boolean);
    const brand = names("#col-4 .card p.syne"), ai = names("section .col-3 .card p.syne").slice(0, 6);
    const STOPS = [
      { title: "Brand Identity", meta: "Logos, color systems, typography, guidelines, web design, print, and messaging.", go: "Explore brand services",
        chips: brand.length ? brand : ["Logo System", "Brand Color Palette", "Typography System", "Brand Guidelines", "Website Design", "Social Media Branding", "Business Card & Print", "Messaging & Voice"] },
      { title: "AI Integration", meta: "Workflow automation, chatbots, reporting, copywriting systems, and AI strategy.", go: "Explore AI services",
        chips: $$("#col-4", pageEl).length && ai.length ? ai : ["AI Workflow Automation", "AI Copywriting System", "Chatbot & Lead Capture", "AI Reporting & Dashboards", "AI Tool Stack Consultation", "AI Brand Asset Generation"] },
    ];
    const LINES = ["First stop: your brand.", "Next stop: AI that does the busywork."];
    const POKE = ["Hi!", "I'm Byte.", "That tickles.", "Beep.", "Okay, okay. Scroll already."];

    hero.setAttribute("data-fx-hero", "");
    inner.setAttribute("data-fx-inner", "");
    const run = make("div", "fx-run"); run.setAttribute("aria-hidden", "true");
    hero.after(run);
    const warp = make("canvas", "fx-warp"); warp.setAttribute("aria-hidden", "true");
    const layer = make("nav", "fx-stops"); layer.setAttribute("aria-label", "What we do");
    const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const stops = STOPS.map((s, i) => {
      const a = make("a", "fx-stop",
        '<span class="fx-stop__bar"></span><span class="fx-stop__body">' +
        '<span class="fx-stop__kicker"><b>0' + (i + 1) + "</b>" + s.chips.length + " services</span>" +
        '<span class="fx-stop__title">' + esc(s.title) + "</span>" +
        '<span class="fx-stop__meta">' + esc(s.meta) + "</span>" +
        '<span class="fx-stop__chips">' + s.chips.map((c) => "<i>" + esc(c) + "</i>").join("") + "</span>" +
        '<span class="fx-stop__go">' + esc(s.go) + ' <span aria-hidden="true">→</span></span></span>');
      a.href = "services.html";
      // stay inside the app when its own Services link is on screen; otherwise the plain link does the job
      a.addEventListener("click", (e) => {
        const link = $$("nav .nav-link").find((b) => b.textContent.trim() === "Services" && b.offsetParent !== null);
        if (link) { e.preventDefault(); link.click(); }
      });
      layer.appendChild(a);
      return a;
    });
    const byte = make("div", "fx-byte", '<span class="fx-byte__jet"><i></i><i></i><i></i></span><div class="fx-byte__body">' + byteSvg() + "</div>");
    byte.setAttribute("aria-hidden", "true");
    const lookG = $(".fx-look", byte);
    const bubEl = make("p", "fx-bubble fx-hero-bubble"); bubEl.setAttribute("aria-hidden", "true");
    const bub = bubbler(bubEl);
    const hud = make("p", "fx-hud", "<span>Flight plan</span><span class=\"fx-hud__pips\">" + stops.map(() => "<i></i>").join("") + "</span><b>0/" + stops.length + "</b>");
    hud.setAttribute("aria-hidden", "true");
    const hint = make("p", "fx-hint", "Scroll to fly <span>↓</span>"); hint.setAttribute("aria-hidden", "true");
    hero.append(warp, layer, byte, bubEl, hud, hint);
    const wctx = warp.getContext("2d"), pips = $$("i", hud), count = $("b", hud);
    const WINDOWS = stops.map((_, i) => 0.07 + (i * 0.4) / Math.max(1, stops.length - 1));   // where each stop's pass begins (each lasts 0.44)

    let W = 0, H = 0, vh = 0, navH = 65, visTop = 0, visH = 0, start = 0, travel = 1, runH = 0, wide = true;
    let bw = 180, restS = 0.5, rest = { x: 0, y: 0 }, fly = { x: 0, y: 0 };
    let cardW = 0, startX = 0, restX = 0, endX = 0, stopY = 0, stars = [];
    const S = { x: 0, y: 0, s: 1, r: 0 }, T = { x: 0, y: 0, s: 1, r: 0 };
    let mode = "idle", p = 0, vel = 0, lastY = r.scrollTop, clock = 0, last = 0, raf = 0, awakeUntil = 0;
    let alive = true, visible = true, done = false, pointer = null, shown = -1, pokes = 0, hinted = false, placed = false;
    const reached = stops.map(() => false);

    const layout = () => {
      const nav = $("nav", r);
      navH = nav ? nav.offsetHeight : 65;
      vh = r.clientHeight; W = hero.clientWidth; H = hero.offsetHeight;
      // A hero taller than the space under the nav pins with its bottom edge on the bottom of the screen, so nothing
      // at its foot is cut off. visTop / visH: the part of the hero you can actually see while it's pinned.
      const pinTop = Math.min(navH, vh - H);
      visTop = navH - pinTop; visH = H - visTop;
      hero.style.setProperty("--fx-pin", pinTop + "px");
      hero.style.setProperty("--fx-vis-top", visTop + "px");
      hero.style.setProperty("--fx-fold", Math.min(H, vh - navH) + "px");
      runH = Math.round(vh * 2.8);   // about two screens of flight, then one for the next section to rise over the sky
      run.style.height = runH + "px";
      run.style.marginBottom = -visH + "px";
      start = pageEl.getBoundingClientRect().top - r.getBoundingClientRect().top + r.scrollTop - pinTop;
      travel = Math.max(1, runH - visH);
      wide = W > 768;
      bw = wide ? clamp(W * 0.14, 150, 210) : clamp(W * 0.34, 110, 150);
      byte.style.setProperty("--fx-bw", bw + "px");
      const rs = wide ? 92 : 60;
      restS = rs / bw;
      // at rest he sits on the corner of the code window; on a phone (no window) in the hero's top right corner
      const keep = inner.style.transform; inner.style.transform = "";
      const card = $(".hide-md > div", inner), hb = hero.getBoundingClientRect(), cb = card && card.getBoundingClientRect();
      rest = cb && cb.width > 0 ? { x: cb.right - hb.left - rs * 0.95, y: cb.top - hb.top - rs * 0.37 } : { x: W - 22 - rs / 2, y: 12 + rs / 2 };
      inner.style.transform = keep;
      fly = wide ? { x: W * 0.29, y: visTop + visH * 0.47 } : { x: W * 0.5, y: visTop + Math.min(visH * 0.2, 150) };
      cardW = stops[0].offsetWidth;
      const cardH = Math.max.apply(null, stops.map((s) => s.offsetHeight));
      startX = W + 40; endX = -(cardW + 40);
      restX = wide ? Math.min(W * 0.46, W - cardW - 40) : (W - cardW) / 2;
      stopY = wide ? visTop + Math.max(12, (visH - cardH) / 2) : fly.y + bw / 2 + 26;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      warp.width = Math.round(W * dpr); warp.height = Math.round(H * dpr);
      wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round(clamp(W / 26, 18, 56)) }, () => ({ x: rnd(0, W + 160), y: rnd(0, H), d: rnd(0.25, 1), hot: Math.random() < 0.25 }));
      if (!placed) { placed = true; S.x = rest.x; S.y = rest.y - 150; S.s = restS; }   // he drops in from above
    };
    const stopX = (u) => {       // glide in, pause beside him (drifting a little), glide out
      if (u < 0.36) return lerp(startX, restX + 24, ease(u / 0.36));
      if (u < 0.64) return lerp(restX + 24, restX - 24, (u - 0.36) / 0.28);
      return lerp(restX - 24, endX, ease((u - 0.64) / 0.36));
    };
    const say = (text, ms) => { if (mode !== "gone" && !done) { bub.say(text, ms); placeBubble(); } };
    const placeBubble = () => {
      const size = bw * S.s, w = bubEl.offsetWidth, h = bubEl.offsetHeight;
      // up and to the right of him, tail corner toward his head; near the right edge it flips to his left
      const flip = S.x + size * 0.2 + w > W - 20;
      bubEl.classList.toggle("is-flip", flip);
      let bx = flip ? S.x - size * 0.2 - w : S.x + size * 0.2;
      if (mode === "voyage" && wide) bx = Math.min(bx, restX - 30 - w);   // in flight it stays clear of the stop beside him
      const x = clamp(bx, 12, Math.max(12, W - w - 12));
      const y = Math.max(8, S.y - size / 2 - h - 6);
      bubEl.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    };
    const look = (dx, dy) => lookG.setAttribute("transform", "translate(" + (dx * 3).toFixed(2) + " " + (dy * 3).toFixed(2) + ")");
    const setMode = (m) => {
      const was = mode; mode = m;
      if (m === "gone") bub.hush();
      if (was === "gone") { S.x = -bw; S.y = fly.y; }   // back in from the left
      byte.classList.toggle("is-flying", m === "voyage");
      hero.classList.toggle("is-flying", m === "voyage");
      requestUpdate();
    };

    const update = (dt) => {
      const y = r.scrollTop;
      vel = dt > 0 ? lerp(vel, (y - lastY) / dt, 0.3) : 0;
      lastY = y;
      p = clamp((y - start) / travel, 0, 1);
      const over = y >= start + runH - 1;   // the next section now covers the whole hero
      if (over !== done) { done = over; hero.setAttribute("data-fx-hero", done ? "done" : ""); if (done) bub.hush(); }
      const m = p <= 0.004 ? "idle" : p < 0.96 ? "voyage" : "gone";
      if (m !== mode) setMode(m);

      // the headline and buttons clear the runway
      const f = 1 - clamp((p - 0.005) / 0.09, 0, 1);
      inner.style.opacity = f < 1 ? f.toFixed(3) : "";
      inner.style.transform = f < 1 ? "translate3d(0," + (-(1 - f) * 70).toFixed(1) + "px,0)" : "";
      inner.style.pointerEvents = f < 0.5 ? "none" : "";   // faded buttons can't be clicked by accident
      hint.style.opacity = f.toFixed(3);

      // the stops
      let n = 0;
      stops.forEach((el, i) => {
        const u = (p - WINDOWS[i]) / 0.44, on = u > 0 && u < 1;
        el.style.visibility = on ? "visible" : "hidden";
        if (on) el.style.transform = "translate3d(" + stopX(u).toFixed(1) + "px," + stopY.toFixed(1) + "px,0)";
        if (u >= 0.3) n++;
        if (u >= 0.3 && u < 0.7 && !reached[i] && m === "voyage") { reached[i] = true; say(LINES[i] || "", 3200); }
        el.classList.toggle("is-here", u >= 0.3 && u <= 0.7);
      });
      if (n !== shown) { shown = n; count.textContent = n + "/" + stops.length; pips.forEach((pip, i) => pip.classList.toggle("is-hit", i < n)); }

      // Byte: perched and small at the top, flying size once you're moving
      const hb = pointer ? hero.getBoundingClientRect() : null;
      const pdx = pointer ? pointer.x - (hb.left + S.x) : 0, pdy = pointer ? pointer.y - (hb.top + S.y) : 0;
      if (m === "idle") {
        T.x = rest.x; T.y = rest.y; T.s = restS; T.r = 0;
        if (pointer) look(clamp(pdx / 320, -1, 1), clamp(pdy / 220, -1, 1)); else look(0, 0);
      } else if (m === "voyage") {
        const k = ease(clamp(p / 0.1, 0, 1));
        let tx = lerp(rest.x, fly.x, k), ty = lerp(rest.y, fly.y, k) + Math.sin(clock * 1.3) * 6 * k;
        if (pointer && fine) {
          tx += clamp(pdx * 0.04, -26, 26); ty += clamp(pdy * 0.06, -26, 26);
          look(clamp(pdx / 320, -1, 1), clamp(pdy / 220, -1, 1));
        } else look(0.5, 0);
        T.x = tx + clamp(vel * 0.03, -40, 70); T.y = ty; T.s = lerp(restS, 1, k); T.r = clamp(vel * 0.004, -9, 9);
      } else {
        T.x = W + bw; T.y = fly.y; T.s = 1; T.r = 12; look(0.8, 0);
      }
      byte.style.setProperty("--fx-v", m === "voyage" ? clamp(Math.abs(vel) * 0.05, 0, 90).toFixed(0) : "0");

      // star streaks: they slide with the scroll and stretch with its speed
      wctx.clearRect(0, 0, W, H);
      const fade = clamp(p * 9, 0, 1) * (1 - clamp((p - 0.93) / 0.07, 0, 1));
      if (fade > 0.01) {
        wctx.lineCap = "round";
        const px = p * travel;
        for (const st of stars) {
          const x = W + 80 - mod(st.x + px * st.d * 0.9, W + 160);
          const len = clamp(Math.abs(vel) * 0.06 * st.d, 1.5, 170);
          wctx.strokeStyle = "rgba(" + (st.hot ? "42,232,245" : "216,238,242") + "," + (fade * (0.12 + 0.5 * st.d)).toFixed(3) + ")";
          wctx.lineWidth = 0.8 + st.d;
          wctx.beginPath(); wctx.moveTo(x, st.y); wctx.lineTo(x + len, st.y); wctx.stroke();
        }
      }
    };
    const apply = () => {
      byte.style.transform = "translate3d(" + (S.x - bw / 2).toFixed(1) + "px," + (S.y - bw / 2).toFixed(1) + "px,0) rotate(" + S.r.toFixed(2) + "deg) scale(" + S.s.toFixed(4) + ")";
      if (bubEl.classList.contains("is-on")) placeBubble();
    };
    const frame = (now) => {
      raf = 0;
      if (!alive) return;
      if (!hero.isConnected) return destroy();
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now; clock += dt;
      update(dt);
      const e = dt > 0 ? 1 - Math.exp(-dt * 8) : 1;
      S.x += (T.x - S.x) * e; S.y += (T.y - S.y) * e; S.s += (T.s - S.s) * e; S.r += (T.r - S.r) * e;
      apply();
      byte.classList.add("is-ready");
      const settled = Math.abs(T.x - S.x) + Math.abs(T.y - S.y) < 0.3 && Math.abs(T.s - S.s) < 0.002 && Math.abs(vel) < 2;
      if (visible && !done && (mode === "voyage" || !settled || now < awakeUntil)) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = (ms) => {
      awakeUntil = performance.now() + (ms || 300);
      if (!raf && alive) raf = requestAnimationFrame(frame);
    };

    const poke = (e) => {
      if (mode === "gone") return;
      e.preventDefault();
      pokes++; hinted = true;
      if (mode === "idle") S.y -= 16; else S.x += 46;
      byte.classList.add("is-poked");
      setTimeout(() => byte.classList.remove("is-poked"), 380);
      say(POKE[(pokes - 1) % POKE.length], 1900);
      wake(700);
    };
    const onMove = (e) => { if (e.pointerType !== "touch") { pointer = { x: e.clientX, y: e.clientY }; if (mode !== "gone") wake(); } };
    const onLeave = () => { pointer = null; wake(); };
    // faded buttons can still be reached with the keyboard: tabbing back into the headline returns you to the top
    const onFocus = () => { if (p > 0.004) r.scrollTo({ top: 0 }); };
    let rt = 0;
    const remeasure = () => { clearTimeout(rt); rt = setTimeout(() => { if (alive) { layout(); wake(); requestUpdate(); } }, 120); };

    byte.addEventListener("pointerdown", poke);
    inner.addEventListener("focusin", onFocus);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", remeasure);
    const ro = "ResizeObserver" in window ? new ResizeObserver(remeasure) : null;
    if (ro) ro.observe(hero);
    const vo = hasIO ? new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) wake(); }) : null;
    if (vo) vo.observe(hero);
    const hintTimer = setTimeout(() => {
      if (!hinted && mode === "idle" && alive) say(fine ? "Hi, I'm Byte. Scroll and I'll show you around." : "Hi, I'm Byte. Scroll to fly.", 4200);
    }, 1900);

    function destroy() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf); clearTimeout(rt); clearTimeout(hintTimer);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", remeasure);
      if (ro) ro.disconnect();
      if (vo) vo.disconnect();
      // if the hero is somehow still on the page, hand it back exactly as it was
      byte.removeEventListener("pointerdown", poke);
      inner.removeEventListener("focusin", onFocus);
      [run, warp, layer, byte, bubEl, hud, hint].forEach((n) => n.remove());
      hero.removeAttribute("data-fx-hero"); hero.classList.remove("is-flying");
      ["--fx-pin", "--fx-vis-top", "--fx-fold"].forEach((v) => hero.style.removeProperty(v));
      inner.removeAttribute("data-fx-inner");
      inner.style.opacity = ""; inner.style.transform = ""; inner.style.pointerEvents = "";
    }

    layout();
    wake(1200);
    return { wake, destroy, away: () => mode === "gone" || done };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // page lifecycle: set up when the app first renders, and again each time it swaps the page
  const currentHero = () => { const r = scroller(); return r ? $("main section", r) : null; };

  function setup() {
    const r = scroller();
    page = hero0.parentElement;
    said = new WeakSet();
    const secs = $$("section", page), footer = $("footer", r);
    secs.forEach((sec, i) => { const line = i > 0 && SAY[labelOf(sec)]; if (line) sec.dataset.fxSay = line; });
    if (footer) footer.dataset.fxSay = FOOTER_SAY;
    zones = footer ? secs.concat(footer) : secs;
    const home = !!$(".hero-btns", hero0) && secs.length > 1;
    plainHome = home && (reduce || !canStick);
    if (home && !plainHome) voyage = makeVoyage(hero0);
  }
  function teardown() {
    if (voyage) { voyage.destroy(); voyage = null; }
    trail.hush();
    page = null; zones = []; plainHome = false;
  }
  function sync() {
    const h = currentHero();
    if (h !== hero0) {
      // The app asks the window to scroll to the top when it changes page, but the page scrolls inside #bsw-root,
      // so the new page used to open wherever the last one was left. Start it at the top, as intended.
      const r = scroller();
      if (hero0 && h && r && r.scrollTop > 0) r.scrollTo({ top: 0, behavior: "instant" });
      teardown(); hero0 = h; if (h) setup();
    }
    decorate();
    requestUpdate();
  }

  document.addEventListener("scroll", () => { requestUpdate(); if (voyage) voyage.wake(); }, { capture: true, passive: true });
  window.addEventListener("resize", () => { $$("[data-fx-ch]").forEach(gutter); requestUpdate(); });
  document.addEventListener("click", () => setTimeout(requestUpdate, 80), true);   // menus opening, tabs switching
  let st = 0;
  new MutationObserver(() => {
    // a new page is marked up before it is first painted; smaller changes (a filter, a counter) can wait a moment
    if (currentHero() !== hero0) { clearTimeout(st); st = 0; sync(); }
    else if (!st) st = setTimeout(() => { st = 0; sync(); }, 120);
  }).observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
  sync();
})();
