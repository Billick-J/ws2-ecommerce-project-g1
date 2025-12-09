// middleware/requireLogin.js
function requireLogin(req, res, next) {
  console.log("requireLogin check:", req.session); // <-- log before the check

  if (!req.session || !req.session.user) {
    // You can change this to res.redirect("/users/login") later
    return res.status(401).send("You must be logged in to access this page.");
  }

  next();
}

module.exports = requireLogin;