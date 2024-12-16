const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {

  const token = req.header('x-access-protected');
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  // console.log(token);
  try {
    const verify = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    req.user = verify;
    next();
  } catch (ex) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

module.exports = adminAuth;
