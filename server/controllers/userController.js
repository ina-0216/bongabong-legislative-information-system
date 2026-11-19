const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const { randomBytes, randomUUID } = require('node:crypto');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinary');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getUsers = asyncHandler(async (req, res) => {
  const { role, status, search, limit = 20, page = 1 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search?.trim()) {
    const safeSearch = escapeRegex(search.trim());
    filter.$or = [
      { firstName: { $regex: safeSearch, $options: 'i' } },
      { lastName: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(filter).select('-password -resetPasswordToken -resetPasswordExpires').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    User.countDocuments(filter)
  ]);

  res.json({ docs: users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

const createUser = asyncHandler(async (req, res) => {
  const { firstName, middleName, lastName, role, contactNumber, position, termStart, termEnd, password } = req.body;
  const email = req.body.email.trim().toLowerCase();

  const allowedRoles = req.user.role === 'System Admin'
    ? ['Secretary', 'Vice Mayor', 'SB Member']
    : ['Vice Mayor', 'SB Member'];

  if (!allowedRoles.includes(role)) {
    res.status(403);
    throw new Error(`You cannot create a '${role}' account`);
  }

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('Email already in use');
  }

  let finalPassword = password;
  let mustChangePassword = false;

  if (!finalPassword) {
    finalPassword = `Blis@${randomBytes(18).toString('base64url')}`;
    mustChangePassword = true;
  }

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(finalPassword, salt);

  const user = await User.create({
    firstName, middleName, lastName, email, password: hashed, role, contactNumber,
    position, termStart, termEnd, status: 'Pending', mustChangePassword
  });

  const fullName = user.name; // uses the virtual getter

  try {
    await sendEmail(
      email,
      'Welcome to B-LIS - Account Created',
      `Hello ${fullName},\n\nYour ${role} account has been created.\nTemporary password: ${finalPassword}\n\nPlease log in to change it.`
    );
  } catch (error) {
    // Keep the account pending so an administrator can retry the invitation.
    // The generated password is unknown to the recipient until delivery succeeds.
    return res.status(202).json({
      message: 'The account was created as Pending, but the invitation email could not be sent. Retry the invitation from the user list.',
      invitationSent: false,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
    });
  }

  user.status = 'Active';
  await user.save();

  res.status(201).json({
    message: `${role} account created. An invitation email was sent to ${email}.`,
    invitationSent: true,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role }
  });
});

const adminResetPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.user.role === 'System Admin' && !['Secretary', 'Vice Mayor', 'SB Member'].includes(user.role)) {
    res.status(403);
    throw new Error('System Admin can only reset Secretary, Vice Mayor, or SB Member passwords');
  }
  if (req.user.role === 'Secretary' && !['Vice Mayor', 'SB Member'].includes(user.role)) {
    res.status(403);
    throw new Error('Secretary can only reset Vice Mayor or SB Member passwords');
  }

  const { newPassword } = req.body;
  const previousCredentials = {
    password: user.password,
    mustChangePassword: user.mustChangePassword,
    resetPasswordToken: user.resetPasswordToken,
    resetPasswordExpires: user.resetPasswordExpires,
    tokenVersion: user.tokenVersion,
  };
  let finalPassword = '';

  if (newPassword) {
    finalPassword = newPassword;
    user.mustChangePassword = false;
  } else {
    finalPassword = `Blis@${randomBytes(18).toString('base64url')}`;
    user.mustChangePassword = true;
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(finalPassword, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  try {
    await sendEmail(
      user.email,
      'B-LIS - Password Reset',
      `Hello ${user.name},\n\nYour password has been reset by an administrator.\nNew password: ${finalPassword}\n\nPlease log in securely.`
    );
  } catch (error) {
    // Restore the previous password when the reset notice cannot be delivered.
    user.password = previousCredentials.password;
    user.mustChangePassword = previousCredentials.mustChangePassword;
    user.resetPasswordToken = previousCredentials.resetPasswordToken;
    user.resetPasswordExpires = previousCredentials.resetPasswordExpires;
    user.tokenVersion = previousCredentials.tokenVersion;
    try {
      await user.save();
    } catch (rollbackError) {
      console.error(`Could not roll back password reset after email failure (${user._id}):`, rollbackError.message);
    }
    throw error;
  }

  const wasPending = user.status === 'Pending';
  if (wasPending) {
    user.status = 'Active';
    await user.save();
  }

  res.json({ message: wasPending
    ? `Invitation sent to ${user.email}. The account is now active.`
    : `Password reset email sent to ${user.email}.` });
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['Pending', 'Active', 'Deactivated'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error('Status must be one of: Pending, Active, Deactivated');
  }

  const updateQuery = status === 'Deactivated'
    ? { status, $inc: { tokenVersion: 1 } }
    : { status };
  const user = await User.findByIdAndUpdate(req.params.id, updateQuery, { new: true }).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({ user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, middleName, lastName, email, contactNumber } = req.body;
  const updates = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (middleName !== undefined) updates.middleName = middleName;
  if (lastName !== undefined) updates.lastName = lastName;
  const normalizedEmail = email === undefined ? undefined : email.trim().toLowerCase();
  if (normalizedEmail !== undefined) updates.email = normalizedEmail;
  if (contactNumber) updates.contactNumber = contactNumber;

  if (normalizedEmail !== undefined) {
    const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user._id } }).select('_id');
    if (existingUser) {
      res.status(409);
      throw new Error('That email address is already in use.');
    }
  }

  const user = await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpires');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  Object.assign(user, updates);
  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      res.status(409);
      throw new Error(error.keyPattern?.email
        ? 'That email address is already in use.'
        : 'That contact number is already in use.');
    }
    throw error;
  }

  res.json(user.toJSON());
});

const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image uploaded.');
  }
  const oldUser = await User.findById(req.user._id);
  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'ibosys/avatars',
    // Give every replacement its own asset so a failed DB update can clean up
    // the new upload without deleting the currently saved profile photo.
    public_id: `avatar_${req.user._id}_${randomUUID()}`,
    resource_type: 'image',
  });
  let user;
  try {
    user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: result.secure_url, profilePicturePublicId: result.public_id },
      { new: true }
    ).select('-password');
  } catch (error) {
    await deleteFromCloudinary(result.public_id).catch(() => {});
    throw error;
  }
  if (!user) {
    await deleteFromCloudinary(result.public_id).catch(() => {});
    res.status(404);
    throw new Error('User not found');
  }
  if (oldUser?.profilePicturePublicId && oldUser.profilePicturePublicId !== result.public_id) {
    await deleteFromCloudinary(oldUser.profilePicturePublicId).catch((error) => {
      console.error(`[User] Replaced avatar cleanup failed for ${oldUser._id}:`, error.message);
    });
  }
  res.json(user);
});

const changePassword = asyncHandler(async (req, res) => {
  if (req.user._id.toString() !== req.params.id) {
    res.status(403);
    throw new Error('Not authorized');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { currentPassword, newPassword } = req.body;

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.mustChangePassword = false;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({ message: 'Password updated successfully' });
});

module.exports = {
  getUsers,
  getMe,
  createUser,
  adminResetPassword,
  updateUserStatus,
  updateProfile,
  updateAvatar,
  changePassword,
};
