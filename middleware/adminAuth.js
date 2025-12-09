// middleware/adminAuth.js
function isAdmin(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Access denied. Admins only.");
  }
  next();
}

module.exports = isAdmin;