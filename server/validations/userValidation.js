const { z } = require('zod');
const { passwordStrength } = require('./authValidation');

const MAX_LENGTHS = {
  firstName: 100,
  middleName: 100,
  lastName: 100,
  email: 254,
  position: 100,
  contactNumber: 20,
};

const getUsersSchema = z.object({
  query: z.object({
    role: z.string().optional(),
    status: z.string().optional(),
    search: z.string().max(200, 'Search term is too long').optional(),
  }),
});

const createUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    middleName: z.string().optional(),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().trim().email('Invalid email format').transform((email) => email.toLowerCase()),
    role: z.enum(['Secretary', 'Vice Mayor', 'SB Member'], {
      errorMap: () => ({ message: 'Role must be Secretary, Vice Mayor, or SB Member' }),
    }),
    contactNumber: z.string().optional(),
    position: z.string().optional(),
    termStart: z.string().optional(),
    termEnd: z.string().optional(),
    password: passwordStrength.optional(), // Admin can set password; if omitted, temporary one is generated
  }),
}).refine(
  (data) => {
    // Position is required for Vice Mayor and SB Member roles per the User model
    if (['Vice Mayor', 'SB Member'].includes(data.body.role) && !data.body.position) {
      return false;
    }
    return true;
  },
  { message: 'Position is required for Vice Mayor and SB Member roles', path: ['body', 'position'] }
);

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['Pending', 'Active', 'Deactivated'], {
      errorMap: () => ({ message: 'Status must be Pending, Active, or Deactivated' }),
    }),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: passwordStrength.optional(),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID'),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1, 'First name is required').optional(),
    middleName: z.string().trim().optional(),
    lastName: z.string().trim().min(1, 'Last name is required').optional(),
    email: z.string().trim().email('Enter a valid email address').transform((value) => value.toLowerCase()).optional(),
    contactNumber: z.string().trim().optional(),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID'),
  }),
});

module.exports = {
  getUsersSchema,
  createUserSchema,
  updateStatusSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
};
