# Rhyton Properties — Website

A sleek, modern marketing site for **Rhyton Properties**, a Dubai real estate agency covering residential sales, rentals and commercial deals.

Built as a zero-dependency static site — no frameworks, no build step. Open `index.html` in a browser, or host it anywhere (GitHub Pages, Netlify, Vercel, any web server).

## Highlights

- **Neutral editorial theme** — Playfair Display + Manrope, charcoal-on-off-white with a deep ink-navy accent; minimal, professional, no gimmicks
- **Animations throughout** — branded preloader, ken-burns hero with scroll-out parallax, staggered text reveals, scroll-triggered fade-ups, animated market counters, district marquee
- **Hero property search** — Buy / Rent / Commercial tabs with location, type and budget; wired to the portfolio filter below
- **Featured portfolio** — filterable property cards (For Sale / For Rent / Commercial) with AED pricing
- **Communities scroller** — Downtown, Palm Jumeirah, Dubai Marina, Business Bay, Emirates Hills
- **Testimonials slider**, services list, about section and a floating-label contact form
- Fully responsive, mobile menu, `prefers-reduced-motion` respected

- **Scroll-driven photographic showcase** — real Dubai photography pinned Apple-style: images settle, crossfade and step through three caption stages with scroll; pure transform/opacity so it runs at full frame rate on any device

## Structure

```
index.html        — single-page site (all sections)
css/style.css     — full theme, animations, responsive rules
js/main.js        — preloader, cursor, reveals, counters, filter, slider, forms
js/showcase.js    — scroll-driven photographic showcase (pinned section)
assets/favicon.svg
.github/workflows/deploy-pages.yml — auto-deploys to GitHub Pages on push
```

## Customising for launch

1. **Photography** — images are hot-linked from Unsplash as placeholders. Replace `images.unsplash.com` URLs with the company's own property photography before launch.
2. **Contact details** — update the phone number, email, office address and RERA ORN in `index.html` (search for `+971`, `hello@rhytonproperties.ae`, `ORN`).
3. **Listings** — edit the `<article class="card">` blocks in the `#properties` section; set `data-category` to `buy`, `rent` or `commercial`.
4. **Contact form** — currently shows a local confirmation only. Wire `contactForm` in `js/main.js` to a CRM, [Formspree](https://formspree.io), or a serverless endpoint.
5. **Social links** — footer icons point to `#`; add the real profiles.

## Local preview

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
