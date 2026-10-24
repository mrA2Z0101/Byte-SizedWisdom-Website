# Byte-Sized Wisdom Website

A storytelling website for Byte-Sized Wisdom. The visitor is the hero, Byte-Sized Wisdom is the guide, and Byte (the pixel robot from the logo) narrates.

Plain HTML, CSS, and JavaScript. There's no build step and no framework. GitHub Pages serves the repository as it is (see `.github/workflows/static.yml`).

## Pages

| File | Story role |
| --- | --- |
| `index.html` | The main story: Prologue → I. The Hero → II. The Obstacles → III. The Guide → IV. The Map → V. The Tools → VI. Tales from the Workshop → VII. The Voices → Epilogue |
| `about.html` | The origin story: background, two worlds, toolkit, values, and the brand-guidelines proof |
| `services.html` | Every service told as a short story (the problem → the turn → the happy ending), plus deliverables and FAQs. Each service has an anchor, e.g. `services.html#logo` |
| `pricing.html` | "Choose your path": packages and à la carte pricing with a filter |
| `contact.html` | "Your next chapter": contact details and the Calendly booking embed |
| `404.html` | Lost-chapter page. It also redirects old routes (`/about`, `/services/logo`, …) to the new pages |

## Assets

- `assets/css/story.css`: theme, layout, and chapter styles. Brand colors are CSS variables at the top.
- `assets/js/story.js`: reading-progress bar, chapter rail, scroll reveals, journey timeline, mobile menu, and pricing filter. Every page still works without JavaScript.
- `assets/docs/bsw-brand-guidelines.pdf`: the Byte-Sized Wisdom brand guidelines document.
- `assets/img/favicon.svg`: the robot mark.

## Editing

To change copy, edit the HTML directly. The site-wide nav and footer appear in every page, so edit all five pages when you change them.
