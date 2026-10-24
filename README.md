# Byte-Sized Wisdom Website

A storytelling website for Byte-Sized Wisdom. The visitor is the hero, Byte-Sized Wisdom is the guide, and Byte (the pixel robot from the logo) narrates.

Plain HTML, CSS, and JavaScript. There's no build step and no framework. GitHub Pages serves the repository as it is (see `.github/workflows/static.yml`).

## Pages

| File | Story role |
| --- | --- |
| `index.html` | The main story, told in short full-screen scenes. Byte (the robot from the logo) stays on screen, changes pose and mood, and says one line per scene, while the backdrop behind him changes: the hook → a sentence that lights up word by word → the problem → the guide → the plan (five steps that swap while the section is pinned) → before & after → what we do → client quotes → a light "Your move" finale |
| `about.html` | The origin story: background, two worlds, toolkit, values, and the brand-guidelines proof |
| `services.html` | Every service told as a short story (the problem → the fix → the happy ending). Deliverables and FAQs fold away under "See what's included". Each service has an anchor, e.g. `services.html#logo` |
| `pricing.html` | "Choose your path": packages and à la carte pricing with a filter |
| `contact.html` | "Your next chapter": contact details and the Calendly booking embed |
| `404.html` | Lost-chapter page. It also redirects old routes (`/about`, `/services/logo`, …) to the new pages |

## Assets

- `assets/css/story.css`: theme, layout, and chapter styles. Brand colors are CSS variables at the top.
- `assets/js/story.js`: reading-progress bar, chapter rail, scroll reveals, word-by-word lit text, pinned steps, rotating quotes, mobile menu, and pricing filter. Every page still works without JavaScript.
- `assets/docs/bsw-brand-guidelines.pdf`: the Byte-Sized Wisdom brand guidelines document.
- `assets/img/favicon.svg`: the robot mark.

## Editing

To change copy, edit the HTML directly. The site-wide nav and footer appear in every page, so edit all five pages when you change them.
