const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isAllowedDuringPasswordChange = (req, userId) => {
  const path = req.originalUrl.split('?')[0];
  const ownPasswordChange = req.method === 'PUT' && path === `/api/users/${userId}/password`;
  const loadOwnProfile = req.method === 'GET' && path === '/api/users/me';
  return ownPasswordChange || loadOwnProfile;
};

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password -resetPasswordToken -resetPasswordExpires');
      if (!req.user) return res.status(401).json({ message: 'User not found' });
      if (decoded.version !== undefined && decoded.version !== (req.user.tokenVersion || 0)) {
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
      }
      if (req.user.status === 'Deactivated') return res.status(401).json({ message: 'Account is deactivated' });
      if (req.user.status !== 'Active') return res.status(401).json({ message: 'Account is not active' });
      if (req.user.mustChangePassword) {
        if (!isAllowedDuringPasswordChange(req, req.user._id)) {
          return res.status(403).json({ message: 'Change your temporary password before using the system.' });
        }
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role '${req.user.role}' is not authorized for this action` });
    }
    next();
  };
};

module.exports = { protect, authorize, isAllowedDuringPasswordChange };
