require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const auth = require("../middleware/auth");

const router = express.Router();

// Create Razorpay order
router.post("/create-order", auth, async (req, res) => {
  try {
    const { amount } = req.body; // in rupees

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Amount must be in paise (smallest unit)
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error("create-order error:", err);
    res.status(500).json({ error: "Unable to create order" });
  }
});

module.exports = router;