const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Use the JWT secret from .env (falls back to a default dev_secret if not set)
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// ----------------------------------------
// REGISTER
// ----------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Optional: Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      address: user.address || "",
      district: user.district || "",
      state: user.state || "",
      pin: user.pin || "",
      mobile: user.mobile || "",
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// ----------------------------------------
// LOGIN
// ----------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email format (optional)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Create JWT token with consistent secret
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Respond with user and token
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address || "",
        district: user.district || "",
        state: user.state || "",
        pin: user.pin || "",
        mobile: user.mobile || "",
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Failed to login" });
  }
});

module.exports = router;