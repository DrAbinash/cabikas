# CA Bikas Kumar — Chartered Accountant, Deoghar

Official website of **CA Bikas Kumar**, Chartered Accountant — B.Com (Hons), Shri Ram College of Commerce; trained at A. F. Ferguson & Co.

**Live domain:** [www.bikas.caredeoghar.com](https://www.bikas.caredeoghar.com)

## Practice details

| | |
|---|---|
| **Office** | Hotel Vijaya, Near Tower Chowk, Jalsar Road, Deoghar — 814112, Jharkhand |
| **Phone / WhatsApp** | +91 99734 97199 |
| **Email** | mailmebikas@gmail.com |

## About this site

A fast, dependency-free static website (plain HTML + CSS + JS — no build step, no framework). Designed after studying the conventions of leading Indian CA firm websites (Lodha & Co., T. R. Chadha & Co., S. S. Kothari Mehta, Dewan P. N. Chopra & Co., and others):

- **Trust-first visual language** — deep navy + antique gold + ivory, serif display headings; the palette of established professional-services firms.
- **Standard structure** — hero with credentials, services grid, why-us, knowledge/resources hub (government portal links + recurring due dates), contact with map.
- **ICAI website-guideline aware** — informational "pull" model: no advertising claims, no client names, no fee schedules, and the customary disclaimer in the footer stating the site is not an advertisement or solicitation.
- **Local + practical** — click-to-call, WhatsApp link, Google Maps embed, and an enquiry form that composes an email locally (no data is stored by the site).
- **SEO ready** — meta/Open Graph tags, canonical URL, `schema.org/AccountingService` JSON-LD, `sitemap.xml`, `robots.txt`.
- **Responsive & accessible** — mobile navigation drawer, semantic HTML, ARIA labels, reduced-motion support.

## Structure

```
index.html        # single-page site: hero, about, services, why-us, resources, contact
404.html          # styled not-found page
css/styles.css    # all styling (CSS custom properties, responsive)
js/main.js        # nav drawer, scroll reveal, active-section nav, enquiry mailto form
favicon.svg       # "BK" monogram favicon
CNAME             # custom domain for GitHub Pages (www.bikas.caredeoghar.com)
robots.txt
sitemap.xml
.nojekyll         # serve files as-is on GitHub Pages
```

## Deployment

The site is fully static — host it anywhere.

**GitHub Pages (recommended):**
1. Repository **Settings → Pages** → Source: *Deploy from a branch* → select the default branch, folder `/ (root)`.
2. The included `CNAME` file points GitHub Pages at `www.bikas.caredeoghar.com`.
3. At the domain registrar, add a `CNAME` DNS record for `www.bikas` (or `www`, per the zone) pointing to `<username>.github.io`, then enable **Enforce HTTPS** in Pages settings.

**Any other host (Netlify, Vercel, cPanel, shared hosting):** upload the files as-is; no build step is required.

## Updating content

- **Services / wording:** edit the relevant section in `index.html`.
- **Due-date table:** in `index.html`, section `#resources` (dates are indicative and should be reviewed when the law changes).
- **Colours / typography:** CSS custom properties at the top of `css/styles.css`.
