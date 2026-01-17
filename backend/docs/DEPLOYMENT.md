# Deployment & Operations Manual

## Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local dev)

## Local Development
1. `npm install`
2. `npx prisma migrate dev`
3. `npm run dev`

## Docker Deployment
1. Build and Run:
   ```bash
   docker-compose up -d --build
   ```
2. Check logs:
   ```bash
   docker-compose logs -f
   ```

## Database
- SQLite database is stored in `./data` volume.
- Backup: Copy the `./data/dev.db` file.

## Monitoring
- Check `/health` endpoint for status.
- Logs are output to stdout (view with `docker logs`).
- API Metrics are available via `/api/stats/summary`.
