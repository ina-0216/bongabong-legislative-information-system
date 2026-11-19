# iBOSys Database Tables (Collections)

Here are the 8 primary database tables (MongoDB collections) used in the iBOSys system. Since we are using MongoDB, these are technically called **"Collections"**, but they function equivalently to tables in a relational database.

### 1. Users (`users`)
Stores the official system login accounts. 
*   **Roles included:** System Admin, Secretary, Vice Mayor, and SB Members. 
*   *(Note: The Verified Resident role has been completely removed from this table).*

### 2. Ordinances (`ordinances`)
The central table of the system. It stores both **Ordinances** and **Resolutions** (distinguished by a `type` field). It tracks their entire lifecycle, text content, dynamic sections, PDF links, and legislative timeline.

### 3. Consultation Feedback (`consultationfeedbacks`)
Stores all the public feedback and votes submitted by citizens during the Public Consultation phase. 
*   **Data stored:** Full Name, Barangay, Contact Number, Vote (Agree/Disagree/Neutral), Written Comment, AI Sentiment tag, ID upload path, and Secretary approval status.

### 4. SB Members (`sbmembers`)
The master list of all elected and appointed Sangguniang Bayan officials. This table is distinct from the `users` table.
*   **Data stored:** Member names, positions, biographies, photos, term assignments, and committee memberships. It populates the "Proponent" dropdown and the Public Portal gallery.

### 5. Legislative Terms (`terms`)
Defines the legislative periods (e.g., "12th Sangguniang Bayan · 2019–2022"). It allows the system to filter ordinances, resolutions, and SB Members based on the term they belong to.

### 6. Committees (`committees`)
Stores the standing committees of the Sangguniang Bayan.
*   **Data stored:** Committee Name, Chairperson, Vice-Chairperson, list of Members, and mandate description.

### 7. Sessions (`sessions`)
Stores the official records and minutes of Sangguniang Bayan sessions.
*   **Data stored:** Session Date, Title, Attendance records, Agenda items, discussed Ordinances, and rich-text proceedings.

### 8. Notifications (`notifications`)
Stores internal system alerts to keep officials updated.
*   **Data stored:** Recipient ID, Title, Message, and Read/Unread status.

---
*(Developer Note: The `correctionrequests`, `votes`, and `comments` collections have been fully removed from the system. They are deprecated and should not be referenced.)*

