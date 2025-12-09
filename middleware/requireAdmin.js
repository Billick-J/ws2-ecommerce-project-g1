// middleware/requireAdmin.js
module.exports = function (req, res, next) {
  // Check if user is logged in and has admin role
  if (req.session.user && req.session.user.role === "admin") {
    return next(); // allow access
  }
  // Otherwise block access
  res.status(403).send("Forbidden: Admins only.");
};