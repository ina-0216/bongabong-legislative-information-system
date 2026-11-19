# Photo Upload Limit: 25 MB Implementation Plan

## Objective

Allow photo uploads up to 25 MiB (25 × 1024 × 1024 bytes) throughout the existing iBOSys upload flows. Enforce the same boundary in the browser and API, and give users a clear message when a photo exceeds it.

## Current State

| Photo upload | User interface | API enforcement today |
|---|---|---:|
| Profile avatar | `client/src/pages/Profile.jsx` | 2 MiB (`server/routes/users.js`) |
| Sangguniang Bayan member photo | `client/src/pages/SBMembers.jsx` | 5 MiB (`server/routes/sbmembers.js`) |
| News announcement cover | `client/src/pages/NewsAdmin.jsx` | 5 MiB (`server/routes/announcements.js`) |
| Public consultation ID image | `public-portal/src/components/GuestForm.jsx` | 5 MiB (`server/routes/public.js`) |
| Mobile consultation ID image | `mobile-app/app/feedback.tsx` | 5 MiB in the picker (`server/routes/public.js`) |

Ordinance PDFs use a separate 15 MiB limit and are not in scope.

## Scope

- Set one shared server-side 25 MiB image limit for all four photo upload routes.
- Apply the same 25 MiB maximum before submission in the admin web forms, public portal, and mobile consultation form.
- Keep existing image MIME-type restrictions and storage behavior.
- Show a clear size error, prevent submission for an oversized file, and allow selecting a replacement.
- Return a clear HTTP 413 response when an API caller exceeds the server limit.
- Update SecondBrain documentation to record the accepted size and affected upload fields.

## Out of Scope

- PDF/document limits, existing stored photos, static site assets, and image compression.
- Changes to hosting/proxy configuration unless repository configuration shows a request-body cap below the planned boundary.

## Acceptance Criteria

1. Each supported image-upload form accepts a photo of exactly 25 MiB and rejects a file larger than 25 MiB before sending the request when file size is available.
2. All corresponding API routes accept image files up to 25 MiB and reject larger files with HTTP 413 and a readable message.
3. Existing MIME-type restrictions continue to reject unsupported image types.
4. Rejected selections do not replace an existing profile/member/news photo and can be corrected by choosing another file.
5. PDF uploads retain their current 15 MiB API limit.
6. Client build(s) and server syntax checks pass; the change is documented in SecondBrain.

## Implementation Plan

1. Add a shared server upload-size constant and use it for avatar, SB member, announcement cover, and public consultation image middleware.
2. Map Multer `LIMIT_FILE_SIZE` failures to HTTP 413 with a consistent, user-readable 25 MiB message.
3. Add a shared browser-side validation helper and apply it to the avatar, member photo, announcement cover, and portal guest ID image selectors. Add a matching mobile picker check. Clear only invalid new selections, preserve valid/current saved data, and block upload submission when a selected file is too large.
4. Add concise helper text and validation feedback where each image selector is shown.
5. Update SecondBrain API, consultation, and UI notes with the new limit and the routes it covers.

## Verification Strategy

- **Detected infrastructure:** Vitest is configured in `server/`, `client/`, and `public-portal/`; the mobile app has its own Vitest setup.
- **Detected commands:** `npm run test:run` in `server/` and `client/`; `npm run test:run` and `npm run build` in `public-portal/`; `npm run build` and `npm run lint` in `client/`; mobile `npm run typecheck` and `npm run lint`.
- **Planned checks:** Inspect the lower boundary, exact 25 MiB boundary, over-limit rejection, replacement after rejection, MIME rejection, and unchanged PDF limit.
- **Execution constraint:** Project instructions for this task prohibit adding or running tests unless requested. Do not add or run tests; verify with the required production builds, lint, and server syntax checks instead. Report the deferred boundary checks accurately.
- Confirm there are no remaining photo-upload paths with a lower byte cap and no change to the ordinance PDF cap.

## Risks and Notes

- A 25 MiB upload is materially larger than current avatar and ID uploads. The API uses in-memory Multer storage before forwarding files, so concurrent large uploads consume additional memory.
- The repository contains no reverse-proxy upload-size configuration. Confirm any hosting platform request limit separately if deployed requests are rejected before reaching Express.

## Implementation and Verification Record

- **Status:** Implemented. All web photo selectors, the mobile consultation picker, and all four server photo upload configurations use a 25 MiB maximum. Server-side size failures return HTTP 413. PDF uploads remain at 15 MiB.
- **Builds/checks passed:** `packages/api` build; `client` production build and lint; `public-portal` production build and lint; `mobile-app` TypeScript check; `node --check` for all affected server routes, the error handler, and upload limit utility.
- **Lint note:** Public portal lint passed with one pre-existing `react/only-export-components` warning in `src/context/LanguageContext.jsx`.
- **Tests:** Not added or run, per the task execution instruction.
- **Static upload-cap audit:** No old 2 MiB or 5 MiB image limit remains in the app/server source. The remaining 15 MiB cap is the ordinance PDF upload.
