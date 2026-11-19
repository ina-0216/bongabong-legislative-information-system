# iBOSys Project Setup Guide

This document describes how to set up the development environment, directory structure, dependencies, and environment variables for the **iBOSys** platform.

**Last Updated**: July 2026 — Public portal UI overhaul (compact layout), backend CORS open policy configured for flexible portal connections, password reset via email (Nodemailer), role-based access control tightened, strict Vite port assignments (5173 for client, 5174 for portal), Vice-Chairperson addition, Session Minutes expanded (with delete), term auto-deactivator cron, node-cron dependency, and updated file references based on the current codebase.

---

## 1. Directory Structure

We will organize the project in a monorepo setup:
```text
capstone final/
├── client/                          # React (Vite) Admin Dashboard Application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── assets/                  # Logos, images (including bongabong.jpg)
│   │   ├── components/              # Reusable UI elements (cards, charts, layouts)
│   │   │   ├── Sidebar.jsx          # Nav — includes "Consultation Review" item
│   │   │   ├── SentimentChart.jsx   # Recharts Pie chart for consultation tally
│   │   │   └── ...                  # Other components
│   │   ├── context/                 # Authentication & global state
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Stats, quick-access filter, chairperson grid, charts
│   │   │   ├── EncodeOrdinance.jsx  # Propose Ordinance/Resolution form with dynamic sections
│   │   │   │                        # — Proponent loaded from SB Members collection
│   │   │   │                        # — Submits as JSON (not FormData)
│   │   │   │                        # — Client-side validation with red border indicators
│   │   │   ├── OrdinanceDetail.jsx  # Detail view — Consultation tab shows approved ConsultationFeedback
│   │   │   ├── OrdinanceList.jsx    # Admin list of all ordinances and resolutions
│   │   │   ├── ConsultationVerification.jsx  # Secretary review queue for pending feedback
│   │   │   ├── ResidentVerification.jsx      # User account registration approvals (page exists, routing pending)
│   │   │   ├── Committees.jsx       # Committee management page
│   │   │   ├── Sessions.jsx         # SB Sessions management and Minutes builder
│   │   │   ├── SBMembers.jsx        # SB Member profile management (source for proponent list; includes termId assignment)
│   │   │   ├── Terms.jsx            # Legislative Term CRUD (label, years, presidingOfficer, isCurrent flag)
│   │   │   ├── Reports.jsx          # PDF report generator
│   │   │   ├── CorrectionsList.jsx  # Minor correction requests workflow (page exists, routing pending)
│   │   │   └── ...                  # Other pages
│   │   ├── utils/
│   │   │   └── api.js               # API client — includes getPendingConsultations, verifyConsultation, getConsultationAnalytics, getSBMembers
│   │   ├── index.css                # Vanilla CSS Design System and styling variables
│   │   │                            # — Includes .field-error and .field-error-msg validation classes
│   │   ├── main.jsx                 # React entry point
│   │   └── App.jsx                  # Main App wrapper & routes
│   ├── package.json
│   └── vite.config.js
├── public-portal/                   # React (Vite) Public Portal Application
│   ├── src/
│   │   ├── assets/
│   │   │   └── hero.png             # Hero banner image for the Home page
│   │   ├── components/
│   │   │   ├── GuestForm.jsx        # 2-step OTP → Full Form with DPA consent
│   │   │   ├── VoteChart.jsx        # Public pie chart — fed by approved ConsultationFeedback
│   │   │   ├── DocumentCard.jsx     # Card component for ordinance/resolution listings
│   │   │   ├── LegislativeTimeline.jsx  # Visual status timeline — stages match server pipeline exactly
│   │   │   ├── Navbar.jsx           # Navigation bar — term dropdowns for Ordinances & Members; FL language support; no search bar
│   │   │   ├── Footer.jsx           # Footer
│   │   │   ├── PageBanner.jsx       # Reusable page banner hero
│   │   │   ├── StatsStrip.jsx       # Stats summary strip
│   │   │   ├── SectionDivider.jsx   # Styled section divider
│   │   │   └── QuickLinksStrip.jsx  # Quick link shortcuts
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Hero, stats, About, Legislation Categories, Resolutions, Proposed Ordinances, Sessions
│   │   │   ├── Ordinances.jsx       # Ordinances archive — filters by ?termId= (defaults to isCurrent term); reads ?committee= from URL
│   │   │   ├── Resolutions.jsx      # Resolutions archive — separate from ordinances
│   │   │   ├── DocumentDetail.jsx   # Document detail — Two-column compact viewport-fit layout; back link routes correctly by type
│   │   │   ├── Sessions.jsx         # Session list with minutes download
│   │   │   ├── Members.jsx          # SB Members gallery — filters by ?termId= (defaults to isCurrent term); shows presiding officer from term
│   │   │   ├── Committees.jsx       # Standing committees
│   │   │   ├── Tourism.jsx          # Tourism information
│   │   │   └── About.jsx            # About page
│   │   ├── context/
│   │   │   └── LanguageContext.jsx  # Filipino/English language switcher — all navbar items, portal subtitle translated
│   │   ├── utils/
│   │   │   └── api.js               # API client — uses VITE_API_URL env var
│   │   └── index.css                # Public portal Vanilla CSS design system
├── images/                          # Root directory for high-res source images
│   └── bongabong.jpg                # Cover image of Bongabong Municipal Hall
├── server/                          # Node.js + Express Backend API
│   ├── config/                      # Database connectivity and auto-seeding setup (db.js, seed.js)
│   ├── middleware/                  # Authentication & role verification guards
│   ├── models/
│   │   ├── Ordinance.js             # Includes sections[], committeeReport subdocument, and termId reference
│   │   ├── SBMember.js              # SB Member profiles (firstName/middleName/lastName); includes termId reference
│   │   ├── Term.js                  # Legislative Term (label, startYear, endYear, presidingOfficer, isCurrent; pre-save middleware)
│   │   ├── Committee.js             # Committee name, chairperson, members, description
│   │   ├── Session.js               # Session records with rich text fields and attendance
│   │   ├── ConsultationFeedback.js  # Core model for public consultation submissions
│   │   └── ...                      # Other models (User, Notification, CorrectionRequest, etc.)
│   ├── routes/
│   │   ├── public.js                # Unauthenticated routes + POST /send-otp + POST /consult/:id/guest
│   │   ├── consultations.js         # GET /pending, PUT /:id/verify, GET /ordinance/:id/feedback
│   │   ├── sbmembers.js             # Admin CRUD endpoints for SB Member profiles (supports multer file uploads)
│   │   ├── ordinances.js            # Full CRUD + status advance + committee-report + amend
│   │   ├── terms.js                 # CRUD for legislative terms (GET / is unprotected, mutations are protected)
│   │   ├── committees.js            # GET + PUT for committee management
│   │   ├── sessions.js              # Session CRUD + minutes PDF upload
│   │   ├── reports.js               # PDF generation endpoints
│   │   └── ...                      # Other routes (auth, users, notifications, corrections)
│   ├── utils/
│   │   ├── sentimentAnalyzer.js     # Keyword-based AI sentiment analysis utility
│   │   └── translator.js            # Auto-translation utility for Tagalog summaries
│   ├── cron/
│   │   ├── idCleaner.js             # DPA-compliance cron — auto-deletes ID images after 30 days
│   │   └── termDeactivator.js       # Auto-deactivates expired Vice Mayor/SB Member accounts daily at midnight
│   ├── uploads/                     # Local folder for uploaded PDFs and IDs (restricted)
│   ├── migrateTerms.js              # One-time migration script
│   ├── package.json
│   └── server.js                    # Server entry point (includes scheduled cron initialization and debug migration routes)
├── .gitignore
└── README.md
```

---

## 2. Dependencies and Installation

### 2.1 Backend Server Dependencies
In the `/server` directory:
```bash
npm install express mongoose jsonwebtoken bcryptjs cors multer dotenv pdfkit puppeteer node-cron
npm install --save-dev nodemon
```
*   `express`: Web server framework.
*   `mongoose`: MongoDB ODM.
*   `jsonwebtoken`: Secure JWT authentication.
*   `bcryptjs`: Password hashing.
*   `cors`: Cross-Origin Resource Sharing.
*   `multer`: File upload handling (for session Minutes PDFs, SB Member photos, and Resident Valid IDs). **Note:** Ordinance create/update do NOT use multer — they accept JSON.
*   `dotenv`: Environment variable configuration.
*   `nodemailer`: Email delivery (used for forgot password and account creation).
*   `pdfkit`: Professional PDF report generation.
*   `puppeteer`: Chromium-based PDF rendering (for complex reports).
*   `node-cron`: Schedule background tasks (e.g. ID cleaner, term deactivator).
*   `nodemon`: Development utility that automatically restarts the server.

> **No new server packages are required** for the Public Consultation feature — OTP simulation uses an in-memory JS object, and the AI Sentiment Analyzer is a pure JavaScript utility.

### 2.2 Frontend Client Dependencies
In the `/client` directory:
```bash
npm install react-router-dom recharts lucide-react axios
npm install framer-motion sonner canvas-confetti
```
*   `react-router-dom`: Client-side routing.
*   `recharts`: Analytics and sentiment charts (Pie chart for consultation tally).
*   `lucide-react`: Elegant modern icons.
*   `axios`: HTTP client.
*   `framer-motion`: Physics-based spring animations, staggered entrances, layout transitions, and modal AnimatePresence effects across all admin pages.
*   `sonner`: Global toast notification system for success, error, and informational feedback. Mounted via `<Toaster />` at the app root (`main.jsx`).
*   `canvas-confetti`: Celebratory confetti burst effects triggered on high-significance milestones (approvals, account creation, ordinance submission).

### 2.3 Public Portal Dependencies
In the `/public-portal` directory:
```bash
npm install react-router-dom recharts lucide-react axios framer-motion sonner date-fns
```
*   All of the above are already in `public-portal/package.json`.
*   The `GuestForm.jsx` uses `framer-motion` for the two-step OTP form animation and `sonner` for toast feedback.

---

## 3. Environment Variables Config

### 3.1 Backend Server (`server/.env`)
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ibosys
JWT_SECRET=ibosys_jwt_secure_super_secret_key_2026
UPLOAD_DIR=uploads/

# Email Configuration (Nodemailer + Gmail App Passwords)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:5173

# Optional configurations for deployment/production storage:
# CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

### 3.2 Frontend Client (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

### 3.3 Public Portal (`public-portal/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```
> **Important:** All hardcoded `http://localhost:5000` references in the public portal now use `import.meta.env.VITE_API_URL` (or its base URL equivalent). This makes the portal deployment-ready without code changes.

---

## 4. Run Commands

### 4.1 Run Backend
In the `/server` directory:
```bash
npm run dev  # (configured with: "dev": "nodemon server.js")
```
> **Note:** When testing the guest consultation form, check the **server terminal** for the simulated OTP log: `[SIMULATION] Sending OTP 123456 to 09XXXXXXXXX`

### 4.2 Run Frontend Admin Dashboard
In the `/client` directory:
```bash
npm run dev
```
The admin application will boot on `http://localhost:5173`. (Configured with `strictPort: true` to prevent silent port changes).

### 4.3 Run Public Portal
In the `/public-portal` directory:
```bash
npm run dev
```
The public application will boot on `http://localhost:5174`. (Configured with `strictPort: true`).

---

## 5. Security & Account Management

### 5.1 Account Creation & Password Resets
*   **Auto-generation:** To ensure strict security, administrators cannot define custom passwords for new users. Instead, the backend automatically generates secure, randomized temporary passwords during account creation.
*   **Role Restriction:** Only the **System Admin** has the authority to create, edit, or delete user accounts (Secretary, Vice Mayor, SB Members). The Secretary is locked out of user management entirely.
*   **Password Reset Flow:** 
    *   An administrative "Reset Password" feature exists that invalidates a user's current password and generates a new temporary password on demand.
    *   A user-facing **"Forgot Password"** flow is available on the login page.
*   **Email Delivery:** The system uses `nodemailer` (via Gmail SMTP) to deliver temporary passwords (upon account creation or admin reset) and secure reset links (via the Forgot Password flow) directly to the user's email address.
*   **Verified Resident Self-Registration:** Residents can register via `POST /api/auth/register` with an ID upload, but require Secretary approval before the account becomes Active.

### 5.2 Forced Password Change Protocol
*   All newly created accounts and reset accounts are flagged with `mustChangePassword: true` in the database.
*   Upon login, the `ProtectedRoute.jsx` component intercepts this state and forces navigation to the `/profile?force=1` page.
*   The user's navigation is entirely locked down until a new, secure permanent password is set, ensuring administrators do not retain long-term access to official's accounts.

### 5.3 Guest Submission Security (Public Consultation)
*   **OTP Verification**: Before filling the form, the resident's contact number is verified via a 6-digit OTP (5-minute expiry). The OTP is stored in-memory on the server and deleted immediately after first successful use.
*   **Duplicate Prevention**: A MongoDB compound index on `(ordinanceId, full_name, contact_number)` in the `ConsultationFeedback` collection prevents duplicate submissions for the same ordinance.
*   **ID File Restriction**: Uploaded Valid ID images are stored in the server's `uploads/` directory and are **not** publicly accessible. Access is only through the authorized Secretary dashboard.
*   **DPA Auto-Deletion**: `server/cron/idCleaner.js` deletes ID files older than 30 days and nulls the `id_attachment_url` field in the database.

### 5.4 API Security
*   The `/api/dump` debug route that previously exposed the entire database without authentication has been **removed**.
*   All data-modifying endpoints are protected by `protect` middleware (JWT check) and `authorize()` role checks.
*   Public routes under `/api/public/` are intentionally unauthenticated and return only sanitized, read-only data.
*   The `GET /api/terms` endpoint is intentionally left unprotected for public portal consumption.

---

## 6. UI & Theme System

### 6.1 Municipal Government Theme
The styling in `client/src/index.css` and `public-portal/src/index.css` implements a bespoke branding scheme tailored specifically for a formal municipal setting:
*   **Background Base:** `#f7f6f3` (Warm paper off-white texture)
*   **Sidebar Background:** `#11281a` (Authoritative dark forest green)
*   **Accents:** Forest green primary (#1e5e3a) and subtle gold/bronze detailing (#b38f4d) for highlights.
*   **Hover/Interactive Color:** Red (`#c0392b`) is used for hover states on interactive elements, replacing the previous pink color.
*   **Typography:** The classical serif font `Cinzel` is imported for official headings, page titles, and branding.
*   **Form Validation:** `.field-error` class applies a red border + light red background to invalid fields. `.field-error-msg` renders the error message below the field.

### 6.2 Split-Panel Login Screen
*   **Background Visual:** Features a local cover photo of the Bongabong Municipal Hall (`/src/assets/bongabong.jpg`) covered with a deep green overlay.
*   **Layout:** A two-column split structure; the left column displays the municipal welcoming message and logo, and the right column contains the authentication form with gold top borders.
*   **Login Animations:** The left panel slides in from the left (`x: -50`) and the right panel slides in from the right (`x: 50`) on page load using `framer-motion`, with individual input fields staggered-in sequentially.

### 6.3 Animation & Interaction System
The frontend uses `framer-motion` to deliver polished, physics-based motion across all admin dashboard pages:
*   **Staggered Dashboard Entry:** Dashboard metric cards and chart panels fade and slide up with a `staggerChildren: 0.1` delay.
*   **Modal Transitions:** All modals animate in with a slide-up and fade-in using `AnimatePresence`.
*   **Toast Feedback:** All form submissions and API operations display `sonner` toast alerts (success/error/info).
*   **Celebratory Confetti:** `canvas-confetti` fires a multi-color burst on milestone completions: ordinance/resolution encoding success, resident approval, correction approval, and new account creation. Colors: `['#1e5e3a', '#b38f4d', '#ffffff']`.
*   **Guest Form OTP Reveal:** The full consultation form on the Public Portal uses `framer-motion` `AnimatePresence` with height/opacity transition to smoothly reveal after OTP is sent.

---

## 7. Known Bugs Fixed (July 2026 Audit)

| # | Severity | Issue | Resolution |
|---|---|---|---|
| 1 | 🔴 Critical | `/api/dump` exposed entire DB without auth | Route removed from `server.js` |
| 2 | 🔴 Critical | Form submission sent as FormData but server expected JSON | `EncodeOrdinance.jsx` now sends `JSON.stringify(payload)` |
| 3 | 🔴 Critical | `?committee=` URL param from Home page ignored in Ordinances | `Ordinances.jsx` now uses `useSearchParams` |
| 4 | 🟠 Moderate | All `localhost:5000` URLs hardcoded in public portal | Replaced with `import.meta.env.VITE_API_URL` |
| 5 | 🟠 Moderate | Legislative timeline showed `Proposed` as a stage (not a real server status) | Fixed to match server pipeline: starts at `First Reading` |
| 6 | 🟠 Moderate | Status filter in Ordinances page missing several valid statuses | Added all 9 statuses including `Committee Assignment`, `For Mayor's Signature`, `For SP Review` |
| 7 | 🟡 Minor | "Ordinance Number" label shown even when encoding a Resolution | Label now dynamically reads `{form.type} Number` |
| 8 | 🟡 Minor | Empty Recent Resolutions section in Home showed blank bordered box | Added "No recent resolutions" empty state |
| 9 | 🟠 Moderate | FL language navbar items wrapping/breaking navbar layout | Added `whiteSpace: 'nowrap'`, reduced `fontSize` to `0.85rem`, reduced padding |
| 10 | 🟡 Minor | `export const translations =` line dropped from `LanguageContext.jsx` causing parse error | Restored missing declaration |
| 11 | 🟡 Minor | Navbar items (Ordinances, Resolutions, Committees, Tourism) not translated in FL mode | Added all nav keys to `LanguageContext.jsx` `en` and `tl` translation objects |
