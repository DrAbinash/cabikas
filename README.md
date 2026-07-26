# B. K. & Co., Chartered Accountants — Deoghar

Official website of **B. K. & Co., Chartered Accountants**. Proprietor: **CA Bikas Kumar**, B.Com (Hons), Shri Ram College of Commerce; trained at A. F. Ferguson & Co.

**Live domain:** [www.bikas.caredeoghar.com](https://www.bikas.caredeoghar.com)

## Practice details

| | |
|---|---|
| **Office** | Hotel Vijaya, Near Tower Chowk, Jalsar Road, Deoghar — 814112, Jharkhand |
| **Phone / WhatsApp** | +91 99734 97199 |
| **Email** | mailmebikas@gmail.com |

## About this site

A fast static website (plain HTML + CSS + JS, no framework) served by a tiny
zero-dependency Node.js server that adds an **admin settings panel** at
`/admin`. It was designed after studying the conventions of leading Indian CA
firm websites (Lodha & Co., T. R. Chadha & Co., S. S. Kothari Mehta and
others):

- **Trust-first visual language** — deep navy + antique gold + ivory, serif display headings; the palette of established professional-services firms.
- **Standard structure** — hero with credentials, services grid, why-us, knowledge/resources hub (government portal links + recurring due dates), contact with map.
- **ICAI website-guideline aware** — informational "pull" model: no advertising claims, no client names, no fee schedules, and the customary disclaimer in the footer stating the site is not an advertisement or solicitation.
- **Local + practical** — click-to-call, WhatsApp link, Google Maps embed, and an enquiry form that composes an email locally (no visitor data is stored by the site).
- **SEO ready** — meta/Open Graph tags, canonical URL, `schema.org/AccountingService` JSON-LD, `sitemap.xml`, `robots.txt`.
- **Responsive & accessible** — mobile navigation drawer, semantic HTML, ARIA labels, reduced-motion and no-JS fallbacks.

### Editable from `/admin` (no code changes needed)

Sign in with the `ADMIN_PASSWORD` (set in `.env` / `docker-compose.yml`) to
edit, with changes applied to the live site immediately:

- Photograph (replaces the "BK" monogram on the profile card)
- ICAI membership number
- Office hours
- Notice banner (announcements at the top of the site)
- Phone, WhatsApp, email and office address — everywhere they appear

Edits persist in the `bikas-ca-data` Docker volume (`data/` when running
locally), so code updates and rebuilds never lose them. The public page keeps
sensible defaults baked into the HTML, so the same `public/` folder also works
on purely static hosting (the admin panel then simply isn't available).

## Structure

```
public/            # the website itself (works standalone as a static site)
  index.html       #   single page: hero, about, services, why-us, resources, contact
  404.html         #   styled not-found page
  css/styles.css   #   all styling (CSS custom properties, responsive)
  js/main.js       #   nav drawer, scroll reveal, settings hydration, enquiry form
  favicon.svg      #   "BK" monogram favicon
  robots.txt, sitemap.xml, CNAME, .nojekyll
server.js          # zero-dependency Node server: static files + /admin + settings API
admin/admin.html   # the admin settings panel
Dockerfile         # node:20-alpine, no npm install needed
docker-compose.yml # Synology Container Manager project (port 3009, volume, healthcheck)
.env.example       # ADMIN_PASSWORD + HOST_PORT documentation
Caddyfile          # reverse-proxy rule (domain → localhost:3009)
DEPLOYMENT.md      # step-by-step Synology NAS deployment guide
```

## Deployment

**Synology NAS (the standard route)** — see [DEPLOYMENT.md](DEPLOYMENT.md).
Short version: upload this folder, create a `.env` with your
`ADMIN_PASSWORD`, create a Container Manager project from
`docker-compose.yml`, and point a DSM reverse-proxy rule for
`www.bikas.caredeoghar.com` at `localhost:3009`.

**Run locally:**

```bash
ADMIN_PASSWORD=mypassword node server.js
# → http://localhost:3000  (site)   http://localhost:3000/admin  (settings)
```

## API (used by the site and admin panel)

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/settings` | — | Current site details (defaults + admin edits) |
| `POST /api/admin/login` | password | Sign in (HttpOnly session cookie, 7 days) |
| `PUT /api/admin/settings` | session | Save edited details |
| `PUT /api/admin/photo` | session | Upload photograph (JPEG/PNG/WebP ≤ 4 MB) |
| `DELETE /api/admin/photo` | session | Remove photograph |
| `GET /healthz` | — | Container healthcheck |
