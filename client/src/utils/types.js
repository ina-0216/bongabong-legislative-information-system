/**
 * Shared domain types for the iBOSys Admin Client.
 *
 * These JSDoc typedefs mirror the server-side Zod schemas (`server/validations/`)
 * and Mongoose models (`server/models/`). They provide a single reference for
 * the API response shapes consumed by `utils/api.js` so destructuring and props
 * stay correct without requiring a TypeScript migration.
 *
 * @module Types
 */

/**
 * A legislative term (e.g. 2025–2028 Sangguniang Bayan).
 * @typedef {Object} Term
 * @property {string} _id
 * @property {string} label
 * @property {number} startYear
 * @property {number} endYear
 * @property {boolean} isCurrent
 * @property {boolean} isUpcoming
 */

/**
 * A Sangguniang Bayan member / councilor.
 * @typedef {Object} SBMember
 * @property {string} _id
 * @property {string} firstName
 * @property {string} [middleName]
 * @property {string} lastName
 * @property {string} position
 * @property {string} [biography]
 * @property {string[]} [committees]
 * @property {string} [contactEmail]
 * @property {string} [fbLink]
 * @property {string} [sbNumber]
 * @property {string} [termId]
 * @property {number} [order]
 * @property {string} [photo]
 */

/**
 * A legislative ordinance or resolution.
 * Mirrors the server `createOrdinanceSchema` input shape.
 * @typedef {Object} Ordinance
 * @property {string} _id
 * @property {'Ordinance'|'Resolution'} [type]
 * @property {string} number
 * @property {string} title
 * @property {string} [title_tl]
 * @property {string|null} [proponentId]  - SBMember id or populated object
 * @property {string} [committee]
 * @property {string} [sectorTag]
 * @property {string} [explanatoryNote]
 * @property {string} [enactingClause]
 * @property {string} [provisions]
 * @property {string} [penaltyClause]
 * @property {string} [effectivityDate]
 * @property {string} [plainLanguageSummary]
 * @property {string} [plainLanguageSummary_tl]
 * @property {Array<{id?: string, title: string, content: string}>} [sections] Legacy records only; new legal text belongs in provisions.
 * @property {string} [termId]
 * @property {string} status
 * @property {boolean} [isLocked]
 * @property {Object} [committeeReport]   - { findings, recommendation, viceSecretaryName }
 * @property {string} [amendedByOrdinanceId]
 */

/**
 * A committee of the Sangguniang Bayan.
 * @typedef {Object} Committee
 * @property {string} _id
 * @property {string} name
 * @property {string} [chairperson]
 * @property {string} [viceChairperson]
 * @property {string[]} [members]
 * @property {string} [description]
 * @property {string} [termId]
 */

/**
 * A session record (minutes of the regular session).
 * @typedef {Object} Session
 * @property {string} _id
 * @property {string} title
 * @property {string} date
 * @property {string} [status]
 * @property {Object} [attendance] - { present: string[], onOfficialBusiness: string[], absent: string[] }
 */

/**
 * A private consultation submission returned only to Secretary/System Admin review screens.
 * @typedef {Object} ConsultationFeedback
 * @property {string} _id
 * @property {string} full_name
 * @property {string} [barangay]
 * @property {string} [contact_number]
 * @property {string} [email]
 * @property {string} [vote]
 * @property {string} [comment]
 * @property {string} [sentiment]
 * @property {string} [status]
 * @property {string} [eligibility_status]
 * @property {string} [comment_status]
 * @property {string} [approval_source]
 * @property {boolean} [canReviewComment]
 * @property {string} [ordinanceId]
 * @property {boolean} [hasIdAttachment]
 */

/**
 * A system user account.
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {string} [status]
 * @property {string} [avatar]
 */

/**
 * Paginated API envelope returned by list endpoints:
 * `{ docs, total, max, pages }`.
 * @typedef {Object} Paginated<T>
 * @property {T[]} docs
 * @property {number} total
 * @property {number} max
 * @property {number} pages
 */

/**
 * Dashboard statistics returned by `GET /api/ordinances/stats`.
 * @typedef {Object} Stats
 * @property {number} totalOrdinances
 * @property {number} totalResolutions
 * @property {number} approved
 * @property {number} inProgress
 * @property {number} consultation
 * @property {Array<{_id: string|number, count: number}>} [byYear]
 * @property {Array<{_id: string, count: number}>} [byCommittee]
 * @property {Array<{name: string, count: number}>} [byProponent]
 */

export {};
