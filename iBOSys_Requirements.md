# iBOSys System Requirements Specification (SRS)
**Project Title**: iBOSys: An Interactive Ordinance Consultation and Governance Platform for Sangguniang Bayan of Bongabong  
**Location Focus**: Sangguniang Bayan (SB) of Bongabong, Oriental Mindoro  
**Last Updated**: July 2026 — Public portal UI overhaul (compact viewport-fit layout, tighter paddings, responsive design improvements), password reset via email (Forgot Password + Admin Reset), role-based access control tightened, Roboto font replacing Cinzel/Inter, Gmail/Nodemailer email integration, Session Minutes form expanded with delete capabilities, Committees updated with Vice-Chairpersons, and paginated dashboard metrics.

---

## 1. Project Overview and Context
The success of local ordinances depends on effective archiving and public participation. Bongabong's Sangguniang Bayan (SB) currently relies on manual, paper-based tracking, physical bulletin boards, and hand-delivered consultation notifications. This manual flow results in disorganized archives, slow document retrieval, and limited citizen participation—especially for residents in remote barangays.

**iBOSys** is a web-based dashboard (for administration and SB officials) and a mobile-responsive web portal (for citizens) that digitalizes the legislative process, centralizes document archiving, collects public feedback/votes via OTP-verified guest submissions, automatically analyzes comment sentiment via AI, and provides real-time progress tracking.

> **Note on Mobile Platform:** The system is built as a mobile-responsive Progressive Web App (PWA). A fully native mobile app is planned as a future enhancement.

---

## 2. User Roles and Permissions

### 2.1 System Admin
*   **Access Portal**: Web-based Dashboard (desktop-first).
*   **Key Responsibilities**:
    *   **Sole manager of user accounts** — creates, edits, deletes, and resets passwords for Secretary, Vice Mayor, and SB Member accounts.
    *   Has full access to all Secretary capabilities (approving residents, proposing/editing ordinances, submitting minor corrections, etc.).
    *   System configuration and general maintenance.
    *   Can edit committee chairpersons and member lists.
    *   Reviews and verifies public consultation feedback submissions (approve/reject + sentiment override).

### 2.2 Secretary
*   **Access Portal**: Web-based Dashboard (desktop-first).
*   **Key Responsibilities**:
    *   **Cannot manage user accounts** — User Management (add, edit, delete, reset passwords) is restricted to System Admin only.

    *   **Reviews pending public consultation feedback** via the dedicated **"Consultation Review"** dashboard page. For each submission, the Secretary:
        *   Views the resident's Full Name, Barangay, Contact Number, and uploaded Valid ID/Barangay Clearance side-by-side.
        *   Reviews the auto-generated AI Sentiment tag (Positive/Negative/Neutral) and may **manually override** it for accuracy (e.g., local expressions, sarcasm).
        *   Clicks **Approve** or **Reject**. Only approved submissions are counted in the official tally.
    *   **Proposes** and drafts ordinances and resolutions (inputs: Number, Title, Proponent (selected from SB Members list), Committee, Sector Tag, Effectivity Date, Explanatory Note, Enacting Clause, complete General Provisions / Resolved Clauses body with numbered sections, Penalty Clause, Plain Language Summary). The complete legal body is entered in one rich-text field.
    *   Creates and saves **Committee Hearing Reports** (findings, recommendation, vice-secretary signatory) for ordinances at the Committee Hearing stage.
    *   Updates ordinance/resolution legislative status (tracking through the stages).
    *   Links new ordinances to old ones for amendatory cross-referencing.
    *   Submits **Minor Correction** requests for clerical errors in approved/locked ordinances.
    *   Filters public comments, views charts, and generates downloadable reports.
    *   Manages committee chairpersons and member lists.
    *   Manages **SB Member profiles** (names, positions, biographies, photos, term dates).
    *   Manages **Legislative Terms** (create, edit, delete term records).
    *   Creates, edits, deletes, and manages **Session Minutes** using the full Minutes Builder form and confirmation modals.

### 2.3 Vice Mayor (Presiding Officer)
*   **Access Portal**: Web-based Dashboard.
*   **Key Responsibilities**:
    *   Approves or rejects **Minor Correction** requests submitted by the Secretary.
    *   Views the real-time legislative tracker dashboard and notifications.
    *   Views data visualizations (public sentiment with Vote and Sentiment badges, committee stats).
    *   Views Committee Hearing Reports filed by the Secretary.

### 2.4 Sangguniang Bayan (SB) Members (Councilors)
*   **Access Portal**: Web-based Dashboard.
*   **Key Responsibilities**:
    *   Views the real-time legislative tracker dashboard and notifications.
    *   Views data visualizations (public sentiment, committee stats, etc.).
    *   **Read-only access** to all dashboard pages — no create, edit, or delete actions.
    *   Views Committee Hearing Reports and ordinance sections.
    *   Views the Consultation Analytics tab (pie chart, tally, filtered feedback list with Vote + Sentiment badges, Barangay/Keyword filters).



### 2.6 General Public (Unauthenticated Users)
*   **Access Portal**: Standalone Public Portal (`/public-portal`). Mobile-responsive.
*   **Key Responsibilities**:
    *   Visits the Home Page showcasing **Proposed Ordinances** and **Recent Resolutions**, with a summary of legislative statistics and recent sessions.
    *   Browses dedicated **Ordinances** and **Resolutions** pages with search, status filter, and committee filter. Clicking a committee category on the Home page automatically pre-filters the Ordinances page.
    *   Views approved ordinances and resolutions (plain language summaries, legislative timeline, warning badges for amendments, and downloadable PDFs).
    *   Views **SB Member public profiles**, committee memberships, and contact details on the Members page.
    *   Views records of **SB Sessions** and downloads official minutes.
    *   Views **Standing Committees** and their mandates.
    *   Views **Tourism** information for Bongabong.
    *   Reads the **About** page describing the Sangguniang Bayan.
    *   **Submits feedback or votes on ordinances** through the following two-step verified flow:
        1.  Enters their contact number and receives a **One-Time Password (OTP)** via SMS to verify ownership.
        2.  Completes the full submission form: Full Name, Barangay, OTP code, Valid ID or Barangay Clearance (file upload), Vote (`Agree`, `Disagree`, `Neutral`), and an optional written comment.
        *   **Note**: If the Ordinance is in the `Public Consultation` phase, a Vote is required. If the Ordinance is in any other phase, the Vote is set to `None` and a written comment is explicitly required.
        3.  Agrees to the **Data Privacy Act of 2012 consent** statement before submitting.
    *   *No account registration is required for public consultations.*

---

## 3. Core Functional Requirements

### 3.1 Ordinance & Resolution Lifecycle & Legislative Tracking
Every ordinance must be tracked sequentially through the following stages:
1.  `First Reading` — Draft introduced, title and number read. *(This is the initial status when a document is proposed.)*
2.  `Committee Assignment` — Referred to one or more committees.
3.  `Committee Hearing` — Joint or single committee discussions. Secretary may create a Committee Hearing Report (findings, recommendation, vice-secretary signature). *(Skipped for Resolutions)*
4.  `Public Consultation` — Portal open for verified guest voting and comments. *(Skipped for Resolutions)*
5.  `Second Reading` — Debates and amendments in SB session.
6.  `Third Reading` — Final voting by SB members.
7.  `For Mayor's Signature` — Sent to the Municipal Mayor.
8.  `For SP Review` — Sent to Sangguniang Panlalawigan of Oriental Mindoro.
9.  `Approved` — Officially enacted, record is permanently locked.

> **Note:** Resolutions follow the streamlined pipeline: `First Reading → Committee Assignment → Third Reading → For Mayor's Signature → Approved`.

### 3.2 Ordinance/Resolution Proposal with Unified Legal Body
*   The system supports proposing both **Ordinances** and **Resolutions** from a single "Propose Document" form.
*   The form dynamically adapts its labels (e.g., "Ordinance Number" vs. "Resolution Number") and placeholder examples based on the selected document type.
*   The **Proponent (SB Member)** dropdown is populated from the dedicated **SB Members collection** (managed on the SB Members page), not from the system user accounts.
*   The form includes **client-side validation**: when the user attempts to submit, any empty required fields are instantly highlighted with a red border and an error message beneath them. Required fields: Number, Title, Proponent, Committee, Explanatory Note, General Provisions.
*   The Secretary enters the complete ordinance provisions or resolution action clauses in one rich-text field, including numbered section headings and bodies.
*   Older records with separately stored sections are merged into the legal body, and their legacy section array is cleared after migration.
*   The form submission sends multipart **FormData** to the server's REST endpoint so the optional official PDF can be attached.

### 3.3 Committee Hearing Report
*   During or after the `Committee Hearing` stage, the Secretary can create and save a **Committee Hearing Report** through the **"Committee Report"** tab on the Ordinance Detail page.
*   The Committee Hearing Report contains:
    *   **Findings**: The findings of the committee hearing.
    *   **Recommendation**: The committee's recommendation for the ordinance.
    *   **Vice Secretary (Signatory)**: The name of the Vice Secretary who will sign the report.
*   Non-secretary users can view the filed Committee Report in read-only mode.
*   The Committee Hearing Report is included in the **Legislative Timeline Report** PDF.

### 3.4 Amendatory Cross-Referencing
*   If a new ordinance amends or repeals an older one, the Secretary links the new ordinance to the older record.
*   The old ordinance record must automatically display a **Warning Badge** ("Amended / Outdated") and feature a direct hyperlink pointing to the newer version.

### 3.5 Minor Corrections Workflow
*   Once an ordinance reaches the `Approved` state, the record is locked to prevent tampering.
*   For clerical or minor typos, the Secretary can submit a **Minor Correction Request** specifying the changes.
*   The **Vice Mayor** must log in to review and approve/reject the request.
*   If approved, the changes are applied automatically and recorded in an **Audit Trail** log.

### 3.6 Interactive Public Consultation & Sentiment Analysis

This is the core citizen-participation feature. The full flow is as follows:

#### 3.6.1 Guest Submission (Public Portal)
1.  The resident visits the ordinance page on the Public Portal.
2.  They enter their **Contact Number** and click "Send OTP". The system generates a 6-digit OTP (valid for 5 minutes) and sends it via SMS.
3.  The resident enters the OTP to unlock the full form.
4.  The full form requires:
    *   **Full Name**
    *   **Barangay** (dropdown)
    *   **Valid ID or Barangay Clearance** (file upload — stored as `id_attachment_url`)
    *   **Vote** — `Agree`, `Disagree`, or `Neutral` (styled radio buttons)
    *   **Written Comment** (optional text area)
    *   **Data Privacy Act Consent** checkbox (required)
5.  On submission, the system performs a **duplicate check**: if the same Full Name + Contact Number has already submitted for this ordinance, the request is blocked (enforced via MongoDB compound unique index).
6.  The **AI Sentiment Analyzer** automatically tags the comment text as `Positive`, `Negative`, or `Neutral`.
7.  The record is saved with `status: Pending`.

#### 3.6.2 Secretary Verification ("Consultation Review" Dashboard)
*   The Secretary accesses the **"Consultation Review"** page from the sidebar.
*   They see a list of all pending feedback with: resident name, barangay, linked ordinance number, vote, and submission date.
*   Clicking a row reveals the full review panel:
    *   Full Name, Barangay, Contact Number
    *   The resident's written comment and vote
    *   The AI-generated Sentiment tag
    *   A **Sentiment Override** dropdown allowing the Secretary to change the tag (for local expressions or ambiguous comments)
    *   The uploaded Valid ID/Clearance image with a secure link
    *   **Approve** and **Reject** buttons
*   Only **Approved** submissions are counted in the official vote tally.
*   On approval/rejection, the `approved_by` (Secretary's User ID) and `approved_at` (timestamp) fields are recorded.

#### 3.6.3 Tally & Analytics (Dashboard — Consultation Tab)
*   The Ordinance Detail page (Consultation tab) displays:
    *   A **Pie Chart** showing Agree/Disagree/Neutral split.
    *   A **majority progress bar** showing the 50%+1 rule threshold.
    *   A **feedback list** of all approved comments, each showing: Full Name, Barangay, a colored Vote badge, a colored Sentiment badge, and the comment text.
    *   **Note**: The tally total and majority progress bar only count submissions with a valid vote (`Agree`/`Disagree`/`Neutral`). Submissions made outside the public consultation phase (where vote is `None`) are excluded from the tally.
*   The list is filterable by:
    *   **Barangay**
    *   **Sentiment** (Positive/Negative/Neutral)
    *   **Keyword search** (searches comment text)
*   The same approved tally is reflected on the **Public Portal** pie chart.

#### 3.6.4 Data Privacy Act (DPA) Compliance
*   Uploaded Valid ID files are stored in a **restricted directory** (not publicly accessible via guessable URL).
*   Authorized personnel (Secretary only) can view the ID during the review process.
*   A **scheduled background job** (`server/cron/idCleaner.js`) automatically and permanently **deletes the physical ID image files** 30 days after submission, removing the database path reference as well.
*   Only essential verification metadata (Name, Barangay, Contact Number, Vote, Sentiment) is retained long-term.

### 3.7 Public Portal Pages
A dedicated standalone web application serves as the **Public Portal** for citizens. It contains the following pages:

| Page | Path | Description |
|---|---|---|
| **Home** | `/` | Hero banner, stats strip, About section, Legislation Categories (by committee), Recent Resolutions, Proposed Ordinances (paginated), Recent Sessions |
| **Ordinances** | `/ordinances` | Searchable, filterable list of all ordinances. Supports `?committee=` URL param from Home page category links and `?termId=` for term filtering (defaults to `isCurrent` term) |
| **Resolutions** | `/resolutions` | Searchable, filterable list of all resolutions |
| **Document Detail** | `/document/:id` | Full ordinance/resolution view with a compact, two-column viewport-fit layout to eliminate scrolling, legislative timeline, and tabs for Overview, Session History, and Public Consultation |
| **Sessions** | `/sessions` | List of all SB sessions with items discussed and minutes download |
| **Members** | `/members` | SB Member gallery with photos, bios, and contact info. Filters by `?termId=` (defaults to `isCurrent` term) |
| **Committees** | `/committees` | Standing committees and their mandates |
| **Tourism** | `/tourism` | Tourism information for Bongabong |
| **About** | `/about` | About the Sangguniang Bayan |

The backend provides unauthenticated, read-only `/api/public/` routes to serve this portal safely.

### 3.8 Data Visualization & Analytics
The dashboard must display the following interactive charts (e.g., using Recharts or Chart.js):
*   **Ordinances Passed per SB Member**: Bar charts showing ordinance authorship/proponents.
*   **Ordinances per Committee/Category**: Distribution of ordinances across different committees (e.g., Finance, Rules, Health).
*   **Year-by-Year Ordinance Trend**: Line charts showing historical trends of ordinance counts.

### 3.9 Dashboard Quick-Access Ordinance Filter
*   The Dashboard includes a **Quick Ordinance Access** panel that allows users to filter and browse ordinances without navigating to the Ordinances page.
*   Filters include:
    *   **Committee** dropdown (e.g., Finance, Health, Education)
    *   **Stage/Status** dropdown (e.g., Approved, Public Consultation, First Reading)
    *   **Preset filter chips** for the most common use cases (e.g., "Approved", "In Consultation", "Finance", "Health", "Education")
*   Results show up to 8 matching ordinances with direct links to their detail pages.
*   A "Clear Filters" button resets the panel.
*   A "View All" link navigates to the full Ordinances page.

### 3.10 Committee Management Page
*   A dedicated **Committees page** (`/committees`) lists all standing SB committees.
*   Each committee card shows:
    *   Committee name
    *   **Chairperson** name
    *   **Vice-Chairperson** name
    *   **Members** list (names)
    *   Optional description of the committee's mandate
*   **Secretary** and **System Admin** roles can edit any committee's chairperson, vice-chairperson, description, and member list (add/remove members by name).
*   The **Dashboard** displays a summary of committee chairpersons for quick reference.

### 3.11 SB Members Management
*   A dedicated **SB Members page** (`/sbmembers`) is accessible to Secretary and System Admin.
*   Manages the official list of elected and appointed SB members including: **firstName**, **middleName**, **lastName** (stored as separate fields with a virtual computed `name` getter), position, photo, biography, committee assignments, `termId` (legislative term reference), term dates, contact email, Facebook link, SB seat number, display order, and `isActive` flag.
*   The SB Members collection is the **single source of truth** for the Proponent dropdown in the Propose Document form — it is not linked to system user accounts.
*   Members are associated with a **Term** (see §3.14), enabling the public portal to filter and display members by legislative term.
*   SB Members use **multipart/form-data** for POST/PUT (to support photo uploads via multer), unlike ordinances which use JSON.

### 3.12 Automated PDF Report Generation
The system generates five downloadable PDF reports (desktop-first):
1.  **Legislative Timeline Report**: A per-ordinance printable report showing legislative stages, completion status, dates, who recorded each step, session notes, and the attached Committee Hearing Report. Users can optionally select which specific stages to include before printing.
2.  **Committee Report**: Summarizes public consultation results (vote splits, comment summary) and final recommendations.
3.  **Annual Ordinance Report**: A full list of all ordinances proposed/approved in a calendar year, including final status, proponents, and committees.
4.  **Consultation Participation Report**: Detailed vote breakdown per ordinance, categorized by barangay demographics.
5.  **Session Minutes Report**: Generates and downloads the official minutes of any recorded session, including attendance, all agenda items, and discussed ordinances.

### 3.13 In-Platform Notifications
*   **SB Members & Vice Mayor**: Notified when an ordinance is assigned to their committee, and when public consultations close.
*   **Secretary**: Notified of pending user registrations and when the Vice Mayor acts on a Minor Correction request.

### 3.14 Legislative Term Management
*   A dedicated **Terms page** in the admin panel allows Secretary and System Admin to create, edit, and delete **legislative terms** (e.g., "12th Sangguniang Bayan · 2019–2022").
*   Each Term record contains:
    *   `label` — Human-readable term name (e.g., "12th Sangguniang Bayan").
    *   `startYear` / `endYear` — Year range of the term.
    *   `description` — Optional note.
    *   `presidingOfficer` — Name of the Vice Mayor for that term, shown on the Public Members page.
    *   `isCurrent` — A boolean flag (enforced unique via pre-save middleware) that marks the active term. Only one term can be current at a time.
*   **Vice Mayor Auto-Sync**: When a Term is created or updated with a `presidingOfficer` name, the server automatically upserts (creates or updates) the corresponding Vice Mayor record in the `SBMember` collection for that term. This keeps the Members page in sync without manual re-entry.
*   **Ordinance Term Assignment**: When encoding an ordinance or resolution, the Secretary selects the term from a dropdown. Defaults to the current term.
*   **SB Member Term Assignment**: Each member profile is linked to a term via `termId`.
*   **Migration Script**: `server/migrateTerms.js` is a one-time script that creates default terms and back-fills existing ordinances and members to the current term.

### 3.15 Public Portal Term Filtering
*   The public portal **Navbar** renders the "Ordinances" and "Members" menu items as **dropdown menus**, listing all available legislative terms. Clicking a term navigates to the page filtered by `?termId=<id>`.
*   The **Ordinances page** and **Members page** both default to the `isCurrent` term when no `termId` query parameter is present.
*   The **Members page** displays the Presiding Officer (Vice Mayor) name pulled from the active term's `presidingOfficer` field.
*   The **Ordinances page** and **Members page** banners dynamically show the selected term's label (e.g., "Members of the Sanggunian — 13th Sangguniang Bayan").

### 3.16 Automated Account Term Deactivation
*   A **daily scheduled cron job** (`server/cron/termDeactivator.js`) runs at midnight (Manila time) using `node-cron`.
*   It automatically sets the `status` to `Deactivated` for any Vice Mayor or SB Member dashboard user account whose `termEnd` date has passed.
*   This ensures that officials whose terms have ended lose system access automatically without manual intervention by the Secretary.

---

## 4. Technical Constraints & Design Rules

*   **Database**: MongoDB. The `ConsultationFeedback` collection is the single source of truth for all guest public consultation submissions, replacing the old separate `votes` and `comments` collections for this purpose. It stores: Full Name, Barangay, Contact Number, ID attachment URL, Vote, Comment, AI Sentiment, Approval Status, and the Secretary who approved (`approved_by`/`approved_at`).
*   **Backend**: Node.js and Express.js, structured REST API with JWT authentication. All ordinance/resolution create and update operations use **JSON request bodies** (`Content-Type: application/json`), not FormData. SB Member photo uploads use multipart/form-data.
*   **Frontend**: React.js with Vite, utilizing React Router, Recharts, and React-pdf.
*   **Styling**: Pure Vanilla CSS. Bespoke municipal government branding (warm off-white background, dark forest green sidebar, gold/bronze accents, **Roboto** sans-serif typography via Google Fonts). No TailwindCSS.
*   **Storage**: Local `uploads/` directory for ID images and member photos (short-term); Cloudinary/AWS S3 integration planned for signed PDF files.
*   **OTP**: In-memory store for development simulation. Production should use Redis + an SMS gateway (e.g., Semaphore PH, Vonage).
*   **Sentiment Analysis**: Keyword-based analyzer (`server/utils/sentimentAnalyzer.js`) for development. Can be upgraded to a real NLP API (e.g., Google Natural Language API) for production.
*   **DPA Auto-Deletion**: Background cron script (`server/cron/idCleaner.js`) runs to delete ID images older than 30 days.
*   **Term Auto-Deactivation**: Background cron script (`server/cron/termDeactivator.js`) runs daily at midnight (Manila time) via `node-cron` to deactivate expired official accounts.
*   **Cron Scheduler**: `node-cron` package is used for scheduled background jobs (replaces `setInterval` approach for term deactivation).
*   **UI Animation & Motion**: `framer-motion` for physics-based spring animations, staggered list entrances, layout transitions, and modal effects.
*   **Toast Notifications**: `sonner` global toast system. `<Toaster />` mounted at app root in `main.jsx`.
*   **Celebration Effects**: `canvas-confetti` for milestone confetti bursts.
*   **Security**: The `/api/dump` debug route has been removed. All sensitive data routes require JWT authentication.
*   **Email**: `nodemailer` with Gmail SMTP (App Password). Credentials stored in `server/.env` (`EMAIL_USER`, `EMAIL_PASS`, `FRONTEND_URL`). Used for: Forgot Password reset links and temporary password delivery on account creation/reset.

---

## 5. UI/UX Design Enhancement Requirements

### 5.1 Animation Standards
All significant page and component transitions must use `framer-motion` to feel polished and intentional:
*   **Page Entry**: Page-level containers use fade-in and slide-up animations (`y: 20` → `y: 0`, `opacity: 0` → `1`) on mount.
*   **Staggered Lists**: Dashboard metric cards, chart containers, and data lists animate in with a staggered delay (`staggerChildren: 0.1`) using a `containerVariants` / `itemVariants` pattern.
*   **Modals**: Modal overlays and dialogs animate in using `AnimatePresence` with a slide-up and fade-in effect and animate out on exit.
*   **Interactive Hover**: Buttons and action elements use `whileHover={{ scale: 1.03 }}` and `whileTap={{ scale: 0.97 }}` for tactile micro-interactions.
*   **Rich-Text Legal Body**: Section headings and content are formatted inside the single provisions editor.
*   **Guest Form OTP Reveal**: The full consultation form animates in smoothly using `framer-motion` height/opacity transition once OTP is sent.

### 5.2 Toast Notification Standards
All asynchronous actions must communicate outcomes via `sonner` toasts:
*   `toast.success("...")` — for completed operations (e.g., ordinance saved, account created, correction approved, committee report saved, consultation approved).
*   `toast.error("...")` — for failed API calls or validation errors (e.g., login failure, OTP expired, duplicate submission blocked).
*   `toast.info("...")` or `toast.warning("...")` — for informational states (e.g., pending items, warnings before destructive actions).
*   Toasts replace all `alert()` and `window.confirm()` patterns to maintain a consistent, unobtrusive UX.

### 5.3 Confetti Celebration Events
High-significance governance milestones trigger a `canvas-confetti` burst to mark the achievement:
*   Public consultation submission approved by Secretary.
*   Minor correction request approved by Vice Mayor.
*   New user account successfully created by Secretary.
*   Ordinance/Resolution proposed and submitted successfully.

### 5.4 Form Validation UI
*   Required fields in the Propose Document form display a **red border** and a **red error message** beneath them when the user attempts to submit without filling them.
*   The red border clears immediately as soon as the user fills in the field.
*   Validation fires client-side first, preventing unnecessary API calls to the server.
