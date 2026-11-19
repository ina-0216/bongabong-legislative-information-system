const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { randomBytes } = require('node:crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id, version = 0) => jwt.sign({ id, version }, process.env.JWT_SECRET, { expiresIn: '7d' });
const PASSWORD_RESET_RESPONSE = 'Password reset link sent to your email.';

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }
  if (user.status === 'Deactivated') {
    res.status(401);
    throw new Error('Your account has been deactivated');
  }
  if (user.status === 'Pending') {
    res.status(401);
    throw new Error('Your account is pending approval');
  }

  // Temporary passwords arrive by email and are often pasted with a trailing
  // newline or surrounding whitespace. Normalize only these generated
  // credentials; user-chosen passwords must continue to match exactly.
  const passwordToVerify = user.mustChangePassword ? password.trim() : password;
  const isMatch = await bcrypt.compare(passwordToVerify, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  res.json({
    token: generateToken(user._id, user.tokenVersion || 0),
    user: {
      _id: user._id, name: user.name, email: user.email,
      role: user.role, status: user.status, mustChangePassword: user.mustChangePassword
    }
  });
});


const forgotPassword = asyncHandler(async (req, res) => {
  const respond = () => res.status(202).json({ message: PASSWORD_RESET_RESPONSE });
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user || user.status !== 'Active') return respond();

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const frontendUrl = (
      process.env.FRONTEND_URL || (
        process.env.NODE_ENV === 'production'
          ? 'https://ibosys-admin-client.vercel.app'
          : 'http://localhost:5173'
      )
    ).replace(/\/+$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const deliverPasswordResetEmail = req.app?.locals?.sendPasswordResetEmail || sendEmail;
    await deliverPasswordResetEmail(
      user.email,
      'B-LIS - Password Reset Request',
      `Hello ${user.name},\n\nYou requested a password reset for your B-LIS account.\n\nPlease click the link below to reset your password (this link is valid for 10 minutes):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\nRegards,\nB-LIS System`
    );

    // Store reset credentials only after the reset email has been accepted.
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
  } catch (error) {
    // Do not return provider/database details or an account-dependent status.
    console.error('[Password Reset] Request could not be completed.', {
      name: error?.name || 'Error',
      code: error?.code,
    });
  }

  return respond();
});

const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  const { password } = req.body;
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save();

  res.json({ message: 'Password successfully reset. You may now log in.' });
});

const seedAdmin = (req, res) => {
  res.status(403).json({ message: 'This endpoint is disabled for security reasons.' });
};

const resetAdminPassword = (req, res) => {
  res.status(403).json({ message: 'This endpoint is disabled for security reasons.' });
};

const resendInvitation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.status !== 'Pending') {
    res.status(400);
    throw new Error('Only Pending accounts can have invitations resent.');
  }
  if (user.role === 'System Admin') {
    res.status(403);
    throw new Error('System Admin accounts cannot be invited.');
  }

  const tempPassword = `Blis@${randomBytes(18).toString('base64url')}`;
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(tempPassword, salt);
  user.mustChangePassword = true;
  await user.save();

  try {
    await sendEmail(
      user.email,
      'Welcome to B-LIS - Account Created',
      `Hello ${user.name},\n\nYour ${user.role} account has been created.\nTemporary password: ${tempPassword}\n\nPlease log in to change it.`
    );
  } catch (error) {
    return res.status(202).json({
      message: 'The invitation email could not be sent. The account remains Pending.',
      invitationSent: false,
    });
  }

  user.status = 'Active';
  await user.save();

  res.json({
    message: `Invitation resent to ${user.email}. The account is now active.`,
    invitationSent: true,
  });
});

module.exports = {
  login,
  forgotPassword,
  resetPassword,
  seedAdmin,
  resetAdminPassword,
  resendInvitation,
};
