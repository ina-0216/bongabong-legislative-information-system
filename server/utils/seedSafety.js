const assertFixtureSeedingAllowed = (env = process.env) => {
  if (env.NODE_ENV === 'production') {
    throw new Error('Fixture seed scripts are disabled in production.');
  }
};

const ensureSeedUser = async (UserModel, user, hashPassword) => {
  const existing = await UserModel.findOne({ email: user.email });
  if (existing) return 'preserved';

  await UserModel.create({ ...user, password: await hashPassword(user.password) });
  return 'created';
};

module.exports = { assertFixtureSeedingAllowed, ensureSeedUser };
