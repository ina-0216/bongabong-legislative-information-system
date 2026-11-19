# iBOSys System Review

Based on the documentation and project files, here is a comprehensive review of the **iBOSys** (Interactive Ordinance Consultation and Governance Platform) system architecture and its three primary components.

## Overall Architecture

The platform follows a modern, decoupled architecture designed for local governance (specifically the Sangguniang Bayan of Bongabong). It is composed of three distinct parts:

1.  **Server (Backend API)**
2.  **Client (Admin Dashboard)**
3.  **Public Portal (Citizen Interface)**

---

### 1. Server (Backend API)
The backend is a robust RESTful API built to handle data persistence, business logic, and automated background tasks.

- **Stack**: Node.js, Express.js, MongoDB (Mongoose).
- **Key Dependencies**: 
  - `jsonwebtoken` & `bcryptjs` for secure authentication.
  - `pdfkit` & `puppeteer` for automated PDF report generation (e.g., Legislative Timeline, Committee Reports, Session Minutes).
  - `nodemailer` for email services (password resets, account creation).
  - `node-cron` for background jobs (e.g., auto-deactivating expired terms and cleaning up ID images after 30 days for Data Privacy Act compliance).
  - `multer` for handling file uploads (e.g., SB member photos, guest ID uploads).
- **Core Features**: 
  - Dual routing structure: Protected (`/api/`) and unauthenticated (`/api/public/`) routes.
  - Custom AI Sentiment Analyzer (`sentimentAnalyzer.js`) for public consultation feedback.
  - Auto-translator (`translator.js`) to generate Tagalog versions of titles and summaries.

### 2. Client (Admin Dashboard)
The admin dashboard is restricted to internal officials (System Admin, Secretary, Vice Mayor, SB Members) for managing the legislative pipeline.

- **Stack**: React 19, Vite, React Router DOM.
- **Key Dependencies**:
  - `framer-motion` for fluid, physics-based UI animations.
  - `recharts` for data visualization and dashboard metrics.
  - `react-quill` for rich-text editing of session minutes and ordinance provisions.
  - `canvas-confetti` for celebrating governance milestones (e.g., ordinance approval).
  - `sonner` for a unified toast notification system.
- **Core Features**:
  - Role-based access control (RBAC).
  - Dynamic form for proposing ordinances with unlimited sections.
  - Consultation verification pipeline for reviewing guest feedback.
  - Real-time legislative tracking and minor correction workflows.

### 3. Public Portal
A standalone, mobile-responsive web application designed for unauthenticated public access, maximizing citizen participation and transparency.

- **Stack**: React 19, Vite, React Router DOM.
- **Key Dependencies**:
  - `axios` for fetching public data.
  - `framer-motion` for smooth page transitions and interactive elements.
  - `recharts` for rendering public-facing data.
  - `date-fns` for robust date formatting.
  - `sonner` for user feedback.
- **Core Features**:
  - Read-only access to approved ordinances, resolutions, and SB member profiles.
  - Legislative term filtering (defaults to the current term).
  - OTP-verified guest submission flow for public consultations (requires a contact number and valid ID upload).
  - Plain language summaries and dynamic Tagalog translations to improve accessibility.

## Summary & Next Steps

The system is structurally sound, leveraging up-to-date technologies (React 19, Vite 8) and adhering to important compliance requirements (DPA of 2012 via background cron jobs). The separation of the Admin Client and the Public Portal is an excellent architectural choice, ensuring that heavy admin bundles do not impact the public user experience, while also enforcing strict security boundaries.

If there are specific areas, features, or files you'd like me to dive deeper into (or if you'd like to start making modifications), just let me know!
