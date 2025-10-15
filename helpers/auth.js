// helpers/auth.js
const jwt = require("jsonwebtoken");

const authOptional = (req, _res, next) => {
  const raw = req.header("Authorization") || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.PRIVATEKEY || "dev_secret");
    } catch (_) {}
  }
  next();
};

const authRequired = (req, res, next) => {
  const raw = req.header("Authorization") || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.PRIVATEKEY || "dev_secret");
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

module.exports = { authOptional, authRequired };
