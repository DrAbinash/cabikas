# ============================================================================
#  Dockerfile — CA Bikas Kumar website (static site + admin settings panel)
#  Optimised for Synology Container Manager.
#  Zero npm dependencies: nothing to install, so builds are fast and
#  reproducible — the image is just Node + the site files.
# ============================================================================

FROM node:20-alpine

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

WORKDIR /app

# Run as a non-root user; /app/data holds admin-editable settings and the
# uploaded photo, persisted via a Docker volume (see docker-compose.yml).
RUN addgroup -S -g 1001 nodejs \
    && adduser -S -u 1001 -G nodejs webuser \
    && mkdir -p /app/data \
    && chown -R webuser:nodejs /app

COPY --chown=webuser:nodejs package.json server.js ./
COPY --chown=webuser:nodejs admin ./admin
COPY --chown=webuser:nodejs public ./public

USER webuser
EXPOSE 3000
CMD ["node", "server.js"]
