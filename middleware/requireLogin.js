// middleware/requireLogin.js
function requireLogin(req, res, next) {
  if (!req.session?.user) {
    // Set a flash message in the session
    req.session.flash = { type: "error", message: "Please log in to access this page." };
    return res.redirect("/users/login"); // correct login path
  }
  next();
}

module.exports = requireLogin;
