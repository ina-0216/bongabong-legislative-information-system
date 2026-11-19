---
name: codebase-analysis-fixes
description: Summary of 9 critical/high-severity bugs fixed in iBOSys codebase analysis
metadata:
  type: project
---

**Fixed 9 issues from codebase analysis (2026-10-21)**

## Critical (4)

1. **Email provider resolution logic** — `server/utils/sendEmail.js:17-23`
   - Bug: `brevoApiKey` referenced before definition when both Brevo & Resend keys present
   - Fix: Read Brevo credentials upfront before provider resolution

2. **Account lockout double-save** — `server/controllers/authController.js:39-47`
   - Bug: `user.save()` called in both if/else branches
   - Fix: Single `await user.save()` after updating lockout fields

3. **Forgot password token rollback broken** — `server/controllers/authController.js:81-106`
   - Bug: Token overwritten before email send; rollback restored stale token
   - Fix: Persist token only AFTER `sendEmail()` succeeds

4. **Update ordinance double sanitization** — `server/controllers/ordinanceController.js:744-789`
   - Bug: Tagalog translation ran on unsanitized HTML; fields sanitized twice
   - Fix: Translate sanitized plain text; removed redundant sanitization pass

## High (5)

5. **CORS rejection 500 instead of 403** — `server/server.js:107`
   - Fix: `callback(err, false)` instead of `callback(err)`

6. **Health endpoint rate limit too strict** — `server/server.js:145-158`
   - Fix: Increase limit from 60 to 6000 req/15min for uptime monitors

7. **Session date validation allows year 9999** — `server/validations/sessionValidation.js:28-35`
   - Fix: Add `year >= 2000 && year <= 2100` bounds to `isoDateSchema`

8. **Distribution email min length 3** — `server/validations/ordinanceValidation.js:55`
   - Fix: Change `.min(3)` to `.min(5)` (minimum valid email: `a@b.c`)

9. **PUPPETEER_CACHE_DIR may not exist** — `server/services/pdfService.js:5-7`
   - Fix: Create cache directory if missing before setting env var

## Verification

- All 146 server tests pass (`npm run test:run`)
- Build completes successfully
- Changes follow existing code patterns and conventions