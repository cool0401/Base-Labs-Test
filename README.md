# Bob's Corn Rate Limiter 🌽

Bob sells corn 🌽 and wants to keep things fair: every client can buy at most one corn per minute. This repo contains:

- `server/`: Express API with Redis-backed rate limiting (Redis mock fallback for local dev).
- `client/`: React + Tailwind frontend that lets clients buy corn and see their purchase status.

Live demo:

- API: <https://base-labs-test.onrender.com/>
- Frontend: <https://base-labs-test.vercel.app/>

## Local Development

1. Install dependencies
   ```bash
   cd server
   npm install
   cd ../client
   npm install
   ```
2. Start the backend (Redis optional locally; use `docker run --rm -p 6379:6379 redis:7-alpine` if desired)
   ```bash
   cd server
   npm run dev
   ```
3. Start the frontend
   ```bash
   cd client
   npm run dev
   ```
4. Configure `client/.env` when pointing to a remote API
   ```bash
   VITE_API_BASE_URL=http://localhost:3000
   ```

If `REDIS_URL` is not provided, the server uses an in-memory Redis mock. For production, always set `REDIS_URL` to a real Redis instance.

### Tests

```bash
cd server
npm run test
```

### Docker Compose (optional)

```bash
docker compose up --build
```

This runs Redis, API, and frontend together.

## Deployment Guide

### Backend on Render (Web Service + Redis Datastore)

1. Push this repository to your GitHub account.
2. In Render:
   - Create **New +** → **Web Service**.
   - Connect to the repo and select `server/Dockerfile`.
   - Set **Environment Variables**:
     - `PORT=3000`
     - `REDIS_URL=<value from Redis datastore>`
3. Create a Redis datastore:
   - **New +** → **Datastore** → **Key Value**.
   - After provisioning, copy the **Internal Connection String**.
   - Add the string to your web service as `REDIS_URL`.
4. Deploy. Health endpoint: `https://<service>.onrender.com/health`.

### Frontend on Vercel

1. Import this repo into Vercel.
2. Project settings:
   - Framework: Vite/React (auto-detected).
   - Build command: `npm run build`
   - Output: `dist`
3. Environment Variables: `VITE_API_BASE_URL=https://<render-service>.onrender.com`
4. Deploy (example live site: <https://base-labs-test.vercel.app/>).

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs server tests (with Redis service) and client lint/build on pushes and PRs.

## Environment Variables

| Variable | Location | Purpose |
| --- | --- | --- |
| `PORT` | server | HTTP port (Render overrides to 10000). |
| `REDIS_URL` | server | Redis connection string (required in production). |
| `VITE_API_BASE_URL` | client | Backend URL exposed to the frontend. |

## Notes

- Production builds copy content from subdirectories explicitly (`server/.`, `client/.`).
- `.dockerignore` prevents shipping git metadata and node_modules to build context.
- Local dev can use Redis mock; production must use a real Redis (e.g., Render datastore).

Enjoy shipping corn! 🌽

