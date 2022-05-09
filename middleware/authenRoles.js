function authBasicRole(req, res, next) {
  const roles = ["user", "admin", "manager"];

  if (roles.includes(req.role)) next();

  return res.sendStatus(403);
}

function authManagerRole(req, res, next) {
  const roles = ["admin", "manager"];

  if (!roles.includes(req.user.role)) {
    return res.sendStatus(403);
  }
  next();
}

function authAdminRole(req, res, next) {
  const roles = ["admin"];

  if (!roles.includes(req.user.role)) {
    return res.sendStatus(403);
  }
  next();
}

module.exports = {
  authManagerRole,
  authBasicRole,
  authAdminRole,
};
