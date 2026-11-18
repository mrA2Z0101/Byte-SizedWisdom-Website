# Byte-SizedWisdom-Website

## Scroll animation

`scroll-fx.js` and `scroll-fx.css` add the scroll animation on top of the built app (`bundle.js`). Every page loads them after the bundle. The site works the same without them.

- **Scroll to fly** (home page): the hero pins under the nav, Byte lifts off the code window, and Brand Identity and AI Integration drift past as two stops before the next section rises over the hero.
- **Trail**: Byte rides a progress line under the nav and comments on each section. Click him to go back to the top.
- **Chapter streaks**: three lines shoot in from the screen edge to each left-aligned section label.
- **Reveals**: headings and cards rise in once as their section arrives.

Byte's lines are in the `SAY`, `LINES` and `POKE` lists near the top of `scroll-fx.js`. With "reduce motion" switched on in the visitor's system settings, nothing is pinned or moved: only the progress trail stays.
