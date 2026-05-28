const express = require("express");
const router = express.Router();
const { Product, Order, User } = require("../models");
const auth = require("../middleware/auth");
const PDFDocument = require("pdfkit");

// ADD PRODUCT (SELLER)
router.post("/", auth, async (req, res) => {
  const product = await Product.create({
    title: req.body.title,
    price: req.body.price,
    quantity: req.body.quantity,
    image_url: req.body.image_url || null,
    seller_id: req.user.id
  });
  res.json(product);
});

// GET PRODUCTS (BUYER)
router.get("/", async (req, res) => {
  const products = await Product.findAll({
    include: [{ model: User, as: "seller", attributes: ["name", "email"] }]
  });
  res.json(products);
});

// UPDATE PRODUCT (SELLER)
router.put("/:id", auth, async (req, res) => {
  const product = await Product.findOne({
    where: { id: req.params.id, seller_id: req.user.id }
  });

  if (!product) return res.status(404).json({ error: "Product not found" });

  product.price = req.body.price;
  product.quantity = req.body.quantity;
  await product.save();

  res.json(product);
});

// PURCHASE PRODUCT (BUYER)
router.post("/:id/purchase", auth, async (req, res) => {
  const buyer = await User.findByPk(req.user.id);

  if (!buyer.address || !buyer.district || !buyer.state || !buyer.pin || !buyer.mobile) {
    return res.status(400).json({
      error: "Complete address & contact details before ordering"
    });
  }

  const product = await Product.findByPk(req.params.id);
  if (!product || product.quantity < req.body.quantity) {
    return res.status(400).json({ error: "Insufficient stock" });
  }

  product.quantity -= req.body.quantity;
  await product.save();

  const order = await Order.create({
    buyer_id: buyer.id,
    seller_id: product.seller_id,
    product_id: product.id,
    quantity: req.body.quantity,
    price_at_purchase: product.price
  });

  res.json(order);
});

// BATCH PURCHASE (CART CHECKOUT)
router.post("/purchase/batch", auth, async (req, res) => {
  const buyer = await User.findByPk(req.user.id);
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "No items to purchase" });
  }

  // Address validation (same as single purchase)
  if (!buyer.address || !buyer.district || !buyer.state || !buyer.pin || !buyer.mobile) {
    return res.status(400).json({
      error: "Complete address & contact details before ordering"
    });
  }

  const orders = [];

  for (const item of items) {
    const product = await Product.findByPk(item.product_id);

    if (!product || product.quantity < item.quantity) {
      return res.status(400).json({
        error: `Insufficient stock for product ${item.product_id}`
      });
    }

    product.quantity -= item.quantity;
    await product.save();

    const order = await Order.create({
      buyer_id: buyer.id,
      seller_id: product.seller_id,
      product_id: product.id,
      quantity: item.quantity,
      price_at_purchase: product.price
    });

    orders.push(order);
  }

  res.json({ success: true, orders });
});

// BUYER ORDERS
router.get("/orders/buyer", auth, async (req, res) => {
  const orders = await Order.findAll({
    where: { buyer_id: req.user.id },
    include: [
      { model: Product, as: "product" },
      { model: User, as: "seller", attributes: ["name", "email"] }
    ],
    order: [["date", "DESC"]]
  });
  res.json(orders);
});

// SELLER ORDERS
router.get("/orders/seller", auth, async (req, res) => {
  const orders = await Order.findAll({
    where: { seller_id: req.user.id },
    include: [
      { model: Product, as: "product" },
      { model: User, as: "buyer", attributes: ["name", "email"] }
    ],
    order: [["date", "DESC"]]
  });
  res.json(orders);
});

// INVOICE PDF - More Modern
router.get("/bill/:id", auth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: Product, as: "product" },
        { model: User, as: "buyer" },
        { model: User, as: "seller" }
      ]
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Set response header
    res.setHeader("Content-Type", "application/pdf");

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    // [Optional] Add a logo if you have one
    // doc.image("path/to/logo.png", 50, 45, { width: 80 });

    // Header
    doc
      .fillColor("#444444")
      .fontSize(20)
      .text("Farm Market Invoice", { align: "center" })
      .moveDown(0.5);

    // Divider
    doc
      .strokeColor("#00aaff")
      .lineWidth(1)
      .moveTo(50, 100)
      .lineTo(545, 100)
      .stroke();

    // Order & Date
    doc
      .fontSize(12)
      .fillColor("#444444")
      .text(`Invoice ID: ${order.id}`, 50, 110)
      .text(`Date: ${new Date(order.date).toLocaleString()}`, 50, 130)
      .moveDown();

    // Buyer / Seller Section
    doc
      .fillColor("#444444")
      .fontSize(14)
      .text("Buyer Details:", 50, 160)
      .fontSize(12)
      .text(`Name: ${order.buyer.name}`, 50, 180)
      .text(`Email: ${order.buyer.email}`, 50, 200);

    doc
      .fontSize(14)
      .text("Seller Details:", 300, 160)
      .fontSize(12)
      .text(`Name: ${order.seller.name}`, 300, 180)
      .text(`Email: ${order.seller.email}`, 300, 200)
      .moveDown();

    // Products Table Header
    doc
      .fontSize(14)
      .fillColor("#007bff")
      .text("Order Details", 50, 240);

    // Product Info
    doc
      .fontSize(12)
      .fillColor("#000000")
      .text(`Product: ${order.product.title}`, 50, 260)
      .text(`Unit Price: Rs. ${order.price_at_purchase.toFixed(2)}`, 50, 280)
      .text(`Quantity: ${order.quantity.toFixed(2)} kg`, 50, 300);

    // Divider before totals
    doc
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .moveTo(50, 330)
      .lineTo(545, 330)
      .stroke();

    // Totals
    const totalAmount = order.quantity * order.price_at_purchase;
    doc
      .fontSize(14)
      .fillColor("#444444")
      .text(`Total Amount: Rs. ${totalAmount.toFixed(2)}`, 50, 350, {
        align: "right"
      });

    // Footer - Thank you
    doc
      .fontSize(10)
      .fillColor("#888888")
      .text(
        "Thank you for shopping at Farm Market!",
        50,
        700,
        { align: "center", width: 500 }
      );

    doc.end();
  } catch (err) {
    console.error("PDF error:", err);
    res.status(500).json({ error: "Could not generate invoice" });
  }
});

module.exports = router;