const { ZodError } = require("zod");

const errorHandler = (err, req, res, next) => {
  // 1. Default fallback values
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || "Internal Server Error";

  // 2. Zod Validation Errors (Request Body Validation)
  if (err instanceof ZodError) {
    statusCode = 400;
    message = err.issues.map(issue => issue.message).join(", ");
  }

  // 3. Mongoose/MongoDB Duplicate Key Index Error (e.g., duplicate email)
  else if (err.code === 11000) {
    statusCode = 400;
    const duplicateField = Object.keys(err.keyValue)[0];
    message = `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists.`;
  }

  // 4.  Mongoose Schema Validation Errors (Fallback database safety net)
  else if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(", ");
  }

  // 5. Invalid Mongoose Object IDs (e.g., GET /api/boards/123-invalid-id)
  else if (err.name === "CastError") {
    statusCode = 404;
    message = `Resource not found with id of ${err.value}`;
  }

  // 6. JSON Web Token Authentication Errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Not authorized, token failed.";
  } 
  
  else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Session expired, please log in again.";
  }

  // 7. Uniform payload structure 
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

module.exports = errorHandler;