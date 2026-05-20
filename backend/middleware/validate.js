const validate = (schema) => async (req, res, next) => {
  try {
    // 1. Pass the execution values into Zod
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // 2. Re-assign the sanitized, defaulted data back to Express 
    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;

    return next();
  } catch (error) {
    // 3. Forward the ZodError straight to your errorHandler.js
    return next(error);
  }
};

module.exports = validate;