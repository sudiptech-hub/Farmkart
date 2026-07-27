require("dotenv").config();

const express = require("express");
const auth = require("../middleware/auth");
// Import the native configuration classes from the updated SDK layout
const { Cashfree } = require("cashfree-pg");

const router = express.Router();

// Initialize Cashfree SDK Configuration
Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;

// Fix: Pass direct strings instead of using Cashfree.Environment properties
Cashfree.XEnvironment =
  process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" ? "PRODUCTION" : "SANDBOX";

// =========================================
// CREATE CASHFREE ORDER
// POST /api/payment/create-order
// =========================================
router.post("/create-order", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
      });
    }

    const calculatedAmount = Number(Number(amount).toFixed(2));

    const requestPayload = {
      order_amount: calculatedAmount,
      order_currency: "INR",
      order_id: `ORDER_${Date.now()}`,
      customer_details: {
        customer_id: req.user?.id ? String(req.user.id) : `CUST_${Date.now()}`,
        customer_phone: req.user?.mobile
          ? String(req.user.mobile).replace(/\D/g, "")
          : "9999999999",
        customer_email: req.user?.email || "buyer@example.com",
      },
      order_meta: {
        // Change the domain part below if your frontend uses a different port like 5173
        return_url: `http://localhost:3000/buyer-orders?order_id={order_id}`,
      },
    };

    // Fix: In the newer version, the method is accessible via 'PGCreateOrder' on the Cashfree gateway instance object wrapper
    const response = await Cashfree.PGCreateOrder("2023-08-01", requestPayload);
    const order = response.data;

    res.json({
      success: true,
      order,
      key: process.env.CASHFREE_CLIENT_ID,
    });
  } catch (err) {
    console.error("--- CASHFREE ERROR FROM SERVER ---");
    console.error(err?.response?.data || err);
    console.error("---------------------------------");

    res.status(500).json({
      success: false,
      error: "Unable to create Cashfree Payment Session.",
    });
  }
});

// =========================================
// VERIFY PAYMENT
// POST /api/payment/verify
// =========================================
router.post("/verify", auth, async (req, res) => {
  try {
    const { cashfree_order_id } = req.body;

    if (!cashfree_order_id) {
      return res.status(400).json({
        success: false,
        error: "Missing payment details.",
      });
    }

    // Fix: Method calls match the active API structural version string parameter
    const response = await Cashfree.PGFetchOrder(
      "2023-08-01",
      cashfree_order_id,
    );
    const orderDetails = response.data;

    if (orderDetails.order_status !== "PAID") {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed. Order is not paid.",
      });
    }

    res.json({
      success: true,
      message: "Payment verified successfully.",
      payment: {
        order_id: orderDetails.order_id,
        amount: orderDetails.order_amount,
        status: orderDetails.order_status,
      },
    });
  } catch (err) {
    console.error("Verify Payment Error:", err?.response?.data || err);

    res.status(500).json({
      success: false,
      error: "Payment verification failed.",
    });
  }
});

module.exports = router;
