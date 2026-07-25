# Deploying this website on your Synology NAS

This guide assumes no coding experience. It walks through getting the
website running on your Synology NAS using **Container Manager** (the
Docker app built into DSM 7.2+), the same way the Hope Neurotrauma
website is deployed.

---

## 1. What you need first

- A Synology NAS with **Container Manager** installed (Package Center →
  search "Container Manager" → Install).
- The domain `www.bikas.caredeoghar.com` (and/or `bikas.caredeoghar.com`)
  pointed at your NAS — the same one-time DNS setting as for
  `hope.caredeoghar.com`.
- This repository, via Git or GitHub's **Code → Download ZIP** button.

## 2. Get the code onto the NAS

**Easiest option — File Station:**
1. On GitHub, click the green **Code** button → **Download ZIP**.
2. In DSM, open **File Station**, create a folder, e.g.
   `/docker/bikas-ca-website`.
3. Upload the ZIP there and extract it (right-click → Extract).

## 3. Set your real settings before building

In the extracted folder, create a file named `.env` (you can copy
`.env.example` and rename it), and set:

- `ADMIN_PASSWORD=` — **change `changeme123`** to a password only you
  know. This protects the `/admin` page where site details are edited.
- `HOST_PORT=` — leave at `3009` unless that port is already used by
  another project on the NAS (the Hope website uses `3008`).

> If creating a `.env` file is awkward, you can instead edit the same two
> values directly in `docker-compose.yml` — they are the lines with
> `ADMIN_PASSWORD` and `3009`.

## 4. Build and run the container

1. Open **Container Manager** → **Project** (left sidebar) → **Create**.
2. **Project name:** `bikas-ca-website`
3. **Path:** choose the folder you uploaded in Step 2 (it must contain
   `docker-compose.yml`).
4. Container Manager will detect `docker-compose.yml` automatically —
   choose "Use existing docker-compose.yml".
5. Click **Next**, then **Done**. The build is quick (the site has no
   dependencies to download).
6. Once it says **Running**, test it from a browser on the same network:
   `http://<your-NAS-IP>:3009`.

## 5. Make it reachable at your real domain (reverse proxy)

- If you already run the Caddy reverse proxy for other sites, the
  included `Caddyfile` shows the ready-made rule — it forwards to
  `localhost:3009`.
- Otherwise DSM's own reverse proxy is simplest: **Control Panel →
  Login Portal → Advanced → Reverse Proxy** → create a rule that forwards
  `www.bikas.caredeoghar.com` (port 443, HTTPS) to `localhost:3009`.
  Add a second identical rule for `bikas.caredeoghar.com` if you want the
  site to open without the `www.` too. DSM handles the SSL certificate
  (**Control Panel → Security → Certificate**, use "Let's Encrypt").

> **Important:** the port in your reverse proxy setup must always match
> the **left-hand side** number in the `ports:` line of
> `docker-compose.yml` (currently `3009:3000`, or your `HOST_PORT`
> value). If you ever change it, update the reverse proxy (and the
> `Caddyfile`, if you use it) to match.

## 6. Check everything works — and personalise the site

- Visit the site — all sections should load, and the buttons should
  call/WhatsApp/email correctly from a phone.
- Go to `https://www.bikas.caredeoghar.com/admin`, sign in with the
  `ADMIN_PASSWORD` you set in Step 3, and fill in:
  - **Photograph** — replaces the "BK" monogram on the profile card;
  - **ICAI membership number** — appears on the profile card and footer;
  - **Office hours** — appears in the Contact section;
  - **Notice banner** — an announcement strip at the top of the site
    (e.g. "ITR filing due 31 July — book early"); clear it to hide it;
  - **Phone / WhatsApp / email / address** — updates every place they
    appear, including the call and WhatsApp buttons.
- Changes apply to the live site immediately — no rebuild needed.
  Bookmark the `/admin` page.

## 7. Updating the site later

Whenever changes are pushed to the GitHub repository:
1. Download the new ZIP (or `git pull` if using Git) into the same NAS
   folder, replacing the old files (keep your `.env`).
2. In Container Manager → Project → select the project → **Action →
   Build** (or **Rebuild**), then **Start**.

Everything edited through `/admin` (details + photo) is stored in a
Docker *volume* (`bikas-ca-data`), kept separately from the code —
rebuilding or updating the site will **not** lose those settings.

## 8. Backups

Admin-edited settings and the photo live in the `bikas-ca-data` Docker
volume. In Container Manager → **Volume**, find where it is stored on
disk and include that folder in your regular Synology Hyper Backup /
Snapshot Replication job. (There is no database and no enquiry data —
the contact form opens the visitor's own email app.)

---

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| Site loads on `http://NAS-IP:3009` but not on your domain | Reverse proxy port doesn't match `3009`, or DNS isn't pointed at your NAS yet |
| Can't sign in at `/admin` | `ADMIN_PASSWORD` in `.env` (or `docker-compose.yml`) doesn't match what you're typing; restart the project after changing it |
| "Too many attempts" at `/admin` | Wrong password entered 10+ times; wait 15 minutes and try again |
| Details edited in `/admin` disappeared | Only happens if the `bikas-ca-data` volume was deleted; a normal Rebuild never touches it |
| Photo won't upload | Must be JPEG/PNG/WebP under 4 MB |
