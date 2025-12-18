function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Ez a művelet csak adminisztrátor számára engedélyezett.' });
}

module.exports = adminOnly;
