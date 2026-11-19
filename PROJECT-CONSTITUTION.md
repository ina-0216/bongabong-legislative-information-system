# Project Constitution

## Project

- **Name:** iBOSys
- **Purpose:** Provide administrative tools and public access to the legislative records and civic information of the Sangguniang Bayan of Bongabong, Oriental Mindoro.
- **Institutional owner:** The project serves the Sangguniang Bayan of Bongabong. The repository does not identify a separate technical owner.

## Principles

- Present official records accurately and make their source and status clear.
- Do not fabricate official dates, summaries, public comments, outcomes, or endorsements.
- Keep legislative information readable on desktop and mobile, including for people using assistive technology.
- Preserve the public's privacy and use moderation and consent rules for consultation data.
- Keep the public portal's civic visual language consistent while retaining native mobile navigation and platform behavior.

## Architecture

- `client/` is the administrative React and Vite application.
- `public-portal/` is the public React and Vite application.
- `mobile-app/` is the Expo and React Native companion app.
- `server/` contains the Express API and MongoDB/Mongoose models.
- `packages/` contains independently installed shared API, UI, and design-token packages.
- There is no root npm workspace. Each app and package keeps its own lockfile and dependency installation boundary.

## Quality Standards

- Validate API mutations with the server's Zod schemas.
- Cover behavior changes with targeted regression tests and run the affected workspace checks.
- Use the shared public API for official records and keep mobile loading, error, and empty states intact.
- Target WCAG 2.1 AA for public-facing interfaces, including keyboard and screen-reader access, text scaling, focus visibility, contrast, and reduced motion.

## Security Requirements

- Preserve authentication and authorization controls; treat them as protected components.
- Keep secrets and credentials in environment or host secret settings. Track only `.env.example` files.
- Collect consultation identity data only under the documented consent, OTP, retention, and access controls.

## Operational Requirements

- Use Node.js `22.23.2`, matching the CI workspaces.
- Build `packages/design-tokens`, `packages/ui`, and `packages/api` before building the web apps on a fresh checkout.
- Do not push, deploy, or publish without explicit user approval.
- Keep API documentation and public client types aligned with the actual server response.
