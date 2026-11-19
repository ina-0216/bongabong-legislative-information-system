const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    res.status(400);
    const issues = error.issues || error.errors || [{ path: [], message: error.message || 'Invalid request.' }];
    return next(new Error(issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')));
  }
};

module.exports = validate;
