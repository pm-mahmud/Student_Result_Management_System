function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: 'Please sign in first.' });
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ message: 'Please sign in first.' });
    if (req.session.user.role !== role) return res.status(403).json({ message: 'You do not have permission.' });
    next();
  };
}
module.exports = { requireAuth, requireRole };
