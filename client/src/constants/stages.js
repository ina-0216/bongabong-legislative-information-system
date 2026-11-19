// Single source of truth for legislative stages. Must match the server's
// utils/constants.js STAGES / RESOLUTION_STAGES exactly.
export const STAGES = [
  'Draft',
  'First Reading',
  'Committee Assignment',
  'Committee Hearing',
  'Public Consultation',
  'Second Reading',
  'Third Reading',
  "For Mayor's Signature",
  'For SP Review',
  'Approved'
];

export const RESOLUTION_STAGES = [
  'Draft',
  'First Reading',
  'Committee Assignment',
  'Third Reading',
  "For Mayor's Signature",
  'Approved'
];

export function getStagesForType(type) {
  return String(type).toLowerCase() === 'resolution' ? RESOLUTION_STAGES : STAGES;
}

export function normalizeStatus(status) {
  if (!status) return 'draft';
  const s = String(status).trim().toLowerCase();
  if (s === 'draft') return 'draft';
  if (s === 'first reading') return 'firstReading';
  if (s === 'committee assignment') return 'committeeAssignment';
  if (s === 'committee hearing') return 'committeeHearing';
  if (s === 'public consultation') return 'consultation';
  if (s === 'second reading') return 'secondReading';
  if (s === 'third reading') return 'thirdReading';
  if (s === "for mayor's signature") return 'mayorSignature';
  if (s === 'for sp review') return 'spReview';
  if (s === 'approved') return 'approved';
  if (s === 'pending') return 'pending';
  if (s === 'active') return 'active';
  if (s === 'deactivated') return 'deactivated';
  if (s === 'rejected') return 'rejected';
  if (s === 'amended') return 'amended';
  return 'draft';
}

// Mirror the server's ROLES enum so client UI checks stay in sync.
export const ROLES = {
  SYSTEM_ADMIN: 'System Admin',
  SECRETARY: 'Secretary',
  VICE_MAYOR: 'Vice Mayor',
  SB_MEMBER: 'SB Member'
};

export const USER_ROLES = Object.values(ROLES);
