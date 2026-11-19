const STAGES = [
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

const RESOLUTION_STAGES = [
  'Draft',
  'First Reading',
  'Committee Assignment',
  'Third Reading',
  "For Mayor's Signature",
  'Approved'
];

// Rejected is a terminal disposition recorded by its own endpoint, not a
// regular stage that can be reached by advancing through the workflow.
const ORDINANCE_STATUSES = [...STAGES, 'Rejected'];

const ROLES = {
  SYSTEM_ADMIN: 'System Admin',
  SECRETARY: 'Secretary',
  VICE_MAYOR: 'Vice Mayor',
  SB_MEMBER: 'SB Member'
};

const USER_ROLES = Object.values(ROLES);

module.exports = {
  STAGES,
  RESOLUTION_STAGES,
  ORDINANCE_STATUSES,
  ROLES,
  USER_ROLES
};
