const express = require("express");
const router = express.Router();
const otpStore = require("../utils/otpStore");
const { sendOTP } = require("../services/mailService");
const { auth } = require("../firebaseAdmin");
const { User } = require("../models");

// ========================================
// REGISTER / FIRST LOGIN
// ========================================
router.post("/register", async (req, res) => {
  try {
    const { idToken, name, role, address, district, state, pin, mobile } =
      req.body;

    if (!idToken) {
      return res.status(400).json({
        error: "Firebase ID Token is required",
      });
    }

    // Verify Firebase token
    const decoded = await auth.verifyIdToken(idToken);

    const firebaseUid = decoded.uid;
    const email = decoded.email;

    let user = await User.findOne({
      where: { firebaseUid },
    });

    if (!user) {
      user = await User.create({
        firebaseUid,
        name,
        email,
        role,
        address,
        district,
        state,
        pin,
        mobile,
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Register Error:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if already registered
    const existing = await User.findOne({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
    });

    await sendOTP(email, otp);
    console.log("Email before sendOTP:", email);

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Failed to send OTP",
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const data = otpStore.get(email);

    if (!data) {
      return res.status(400).json({
        success: false,
        error: "OTP not found",
      });
    }

    // Check expiry
    if (Date.now() > data.expires) {
      otpStore.delete(email);

      return res.status(400).json({
        success: false,
        error: "OTP expired",
      });
    }

    // Wrong OTP
    if (data.otp !== otp) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP",
      });
    }

    // Correct OTP
    otpStore.delete(email);

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});
// ========================================
// LOGIN
// ========================================
router.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        error: "Firebase ID Token is required",
      });
    }

    const decoded = await auth.verifyIdToken(idToken);

    const firebaseUid = decoded.uid;

    const user = await User.findOne({
      where: { firebaseUid },
    });

    if (!user) {
      return res.status(404).json({
        error: "User profile not found",
      });
    }

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Login Error:", err);

    return res.status(401).json({
      error: "Invalid Firebase Token",
    });
  }
});

// ========================================
// VERIFY TOKEN
// ========================================
router.get("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Authorization header missing",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const decoded = await auth.verifyIdToken(token);

    const user = await User.findOne({
      where: {
        firebaseUid: decoded.uid,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    res.status(401).json({
      error: "Unauthorized",
    });
  }
});

module.exports = router;
