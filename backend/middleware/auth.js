const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

function authMiddleware(req, res, next) {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Hiányzó vagy érvénytelen token.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // hozzáadjuk a felhasználót a kéréshez
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Érvénytelen vagy lejárt token.' });
  }
}

module.exports = authMiddleware;
