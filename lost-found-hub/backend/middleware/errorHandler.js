/* Centralized error handler. Works together with "express-async-errors",
   which forwards errors thrown inside async route handlers to this middleware. */
function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(", ") });
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server error",
  });
}

module.exports = errorHandler;
