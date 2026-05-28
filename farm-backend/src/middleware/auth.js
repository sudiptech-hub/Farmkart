const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Must match the secret used in login
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header)
      return res.status(401).json({ error: "Unauthorized - No auth header" });

    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      return res.status(401).json({ error: "Unauthorized - Token format invalid" });

    const token = parts[1];

    // Verify token using same secret as login
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id)
      return res.status(401).json({ error: "Unauthorized - Token invalid" });

    // Attach user instance
    const user = await User.findByPk(decoded.id);
    if (!user)
      return res.status(401).json({ error: "Unauthorized - User not found" });

    req.user = user; // attach your existing user
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};