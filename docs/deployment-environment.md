# Deployment Environment

This document lists server-side settings for the iBOSys API. Keep credentials in Render's private environment settings; never commit secrets or put them in a browser bundle.

## Required production settings

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Set to `production`. |
| `MONGODB_URI` | Connection string for the configured MongoDB database. |
| `JWT_SECRET` | At least 32 characters and generated from cryptographically secure randomness. |
| `FRONTEND_URL` | Exact deployed admin-client origin. |
| `PORTAL_URL` | Exact deployed public-portal origin. |
| `EMAIL_PROVIDER` | Explicitly select `brevo`, `resend`, `smtp`, or `gmail`. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name for approved media and consultation-ID storage. |
| `CLOUDINARY_API_KEY` | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret. |
| `REDIS_URL` | Redis connection used for OTP storage. A Redis outage degrades OTP flows and marks the health check degraded, but does not take the API down. |
| `SMS_OTP_MODE` | Production SMS provider mode, currently configured as `textbee` in the Render blueprint. |
| `TEXTBEE_API_KEY` | Server-only TextBee credential when `SMS_OTP_MODE=textbee`. |

Configure only the selected email provider's complete credential set:

| `EMAIL_PROVIDER` | Required settings |
| --- | --- |
| `brevo` | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` |
| `resend` | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| `smtp` or `gmail` | `EMAIL_USER`, `EMAIL_PASS` |

The API refuses to start in production if the provider is missing, unsupported, or lacks one of its required credentials. On Render Free, use an HTTPS email provider such as Brevo or Resend because outbound SMTP may be blocked.

The server pins Mammoth's nested `argparse` dependency to 3.0.3, which removes the vulnerable `sprintf-js` chain without downgrading Mammoth. Because Mammoth 1.13's CLI still uses argparse 1.x method names, the server's `postinstall` applies the tracked compatibility patch in `server/patches/mammoth+1.13.0.patch`. Keep the patch and the DOCX extraction and CLI regression checks aligned when updating Mammoth or argparse. The production dependency audit currently reports no vulnerabilities.

## Health check policy

`/api/health` treats MongoDB as the critical dependency. If MongoDB is unavailable, it returns HTTP 503 and `status: "degraded"`. If only Redis is unavailable, it returns HTTP 200 with `status: "degraded"` and `checks.redis: "down"`, so Render keeps the API running while OTP endpoints remain unavailable. The Redis ping is bounded to two seconds so a stalled connection cannot hold the health request open.

## CORS origins

Set `FRONTEND_URL` and `PORTAL_URL` to exact HTTPS origins without trailing path components. Optional `CORS_ORIGINS` accepts a comma-separated allowlist for additional trusted origins. Requests with an unlisted `Origin` receive HTTP 403. Requests without an `Origin` continue to normal route authentication.

## Storage and service plan

PDF/DOCX extraction processes the upload in memory and does not retain the source document. Consultation ID images use the separate authenticated Cloudinary path and are available only to eligible reviewers through the protected API route.

The checked-in Render blueprint currently selects free API and Key Value services. The API service can spin down when idle, and the free Key Value service does not persist data across restarts. Before handling live municipal or resident data, provision production services with persistent Redis, backups, and data-processing controls appropriate to the municipality. The blueprint is a deployment template; its presence does not mean the Render or Vercel services have been created or configured.

The shared package update resolves the high Vite and follow-redirects advisories. A low-severity esbuild advisory remains in development tooling; the compatible package update path did not remove it.

## Separate web deployments

This repository contains the API, admin client, public portal, mobile app, and shared packages. Connect the municipality-owned GitHub repository to the hosting providers. Configure the Render service with `server/` as its root directory, and create separate Vercel projects with `client/` and `public-portal/` as their root directories. Each Vercel project must include source files outside its root directory so it can build the shared packages. Set API and service environment variables in the hosting providers' private settings; a GitHub connection does not create or configure the hosted services.
