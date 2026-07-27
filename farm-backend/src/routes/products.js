const express = require("express");
const router = express.Router();

const { Product, Order, User, Cart, sequelize } = require("../models");

const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const PDFDocument = require("pdfkit");
const sendOrderMail = require("../utils/sendMail");

// ======================================================
// ADD PRODUCT (SELLER)
// ======================================================

router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const product = await Product.create({
      title: req.body.title,
      price: req.body.price,
      quantity: req.body.quantity,
      image_url: imageUrl,
      seller_id: req.user.id,
      description: req.body.description,
    });

    res.json(product);
  } catch (err) {
    console.error("Add Product Error:", err);

    res.status(500).json({
      error: "Failed to add product",
    });
  }
});

// ======================================================
// GET ALL PRODUCTS
// ======================================================

router.get("/", async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: User,
          as: "seller",
          attributes: ["name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(products);
  } catch (err) {
    console.error("Load Products Error:", err);

    res.status(500).json({
      error: "Failed to fetch products",
    });
  }
});

// ======================================================
// UPDATE PRODUCT
// ======================================================

router.put("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        seller_id: req.user.id,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    product.title = req.body.title ?? product.title;
    product.price = req.body.price ?? product.price;
    product.quantity = req.body.quantity ?? product.quantity;
    product.description = req.body.description ?? product.description;

    if (req.body.image_url) {
      product.image_url = req.body.image_url;
    }

    await product.save();

    res.json({
      success: true,
      product,
    });
  } catch (err) {
    console.error("Update Product Error:", err);

    res.status(500).json({
      error: "Failed to update product",
    });
  }
});

// ======================================================
// DELETE PRODUCT
// ======================================================

router.delete("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      where: {
        id: req.params.id,
        seller_id: req.user.id,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    // Remove all cart entries for this product
    await Cart.destroy({
      where: {
        product_id: product.id,
      },
    });

    // Remove related orders
    await Order.destroy({
      where: {
        product_id: product.id,
      },
    });

    await product.destroy();

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error("Delete Product Error:", err);

    res.status(500).json({
      error: "Server error",
    });
  }
});
// ======================================================
// PURCHASE SINGLE PRODUCT
// ======================================================

router.post("/:id/purchase", auth, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const buyer = await User.findByPk(req.user.id, {
      transaction,
    });

    if (
      !buyer.address ||
      !buyer.district ||
      !buyer.state ||
      !buyer.pin ||
      !buyer.mobile
    ) {
      await transaction.rollback();

      return res.status(400).json({
        error: "Complete address & contact details before ordering",
      });
    }

    const quantity = Number(req.body.quantity);

    const product = await Product.findByPk(req.params.id, {
      transaction,
    });

    if (!product) {
      await transaction.rollback();

      return res.status(404).json({
        error: "Product not found",
      });
    }

    if (product.quantity < quantity) {
      await transaction.rollback();

      return res.status(400).json({
        error: "Insufficient stock",
      });
    }

    // Reduce Stock
    product.quantity -= quantity;

    await product.save({
      transaction,
    });

    // Create Order
    const order = await Order.create(
      {
        buyer_id: buyer.id,
        seller_id: product.seller_id,
        product_id: product.id,
        quantity,
        price_at_purchase: product.price,
      },
      {
        transaction,
      },
    );

    // Remove Product From Cart
    await Cart.destroy({
      where: {
        buyer_id: buyer.id,
        product_id: product.id,
      },
      transaction,
    });

    await transaction.commit();

    const seller = await User.findByPk(product.seller_id);

    await sendOrderMail({
      sellerEmail: seller.email,

      sellerName: seller.name,

      buyer,

      products: [
        {
          title: product.title,

          quantity,

          price: product.price,
        },
      ],

      paymentMethod: "ONLINE",
    });

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    await transaction.rollback();

    console.error("Purchase Error:", err);

    res.status(500).json({
      error: "Purchase failed",
    });
  }
});

// ======================================================
// BATCH PURCHASE (CHECKOUT ALL)
// ======================================================

router.post("/purchase/batch", auth, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const buyer = await User.findByPk(req.user.id, {
      transaction,
    });

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback();

      return res.status(400).json({
        error: "No items selected",
      });
    }

    if (
      !buyer.address ||
      !buyer.district ||
      !buyer.state ||
      !buyer.pin ||
      !buyer.mobile
    ) {
      await transaction.rollback();

      return res.status(400).json({
        error: "Complete address & contact details before ordering",
      });
    }

    const orders = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id, {
        transaction,
      });

      if (!product) {
        await transaction.rollback();

        return res.status(404).json({
          error: `Product ${item.product_id} not found`,
        });
      }

      if (product.quantity < item.quantity) {
        await transaction.rollback();

        return res.status(400).json({
          error: `${product.title} has only ${product.quantity} kg available`,
        });
      }

      // Reduce Stock
      product.quantity -= item.quantity;

      await product.save({
        transaction,
      });

      // Create Order
      const order = await Order.create(
        {
          buyer_id: buyer.id,
          seller_id: product.seller_id,
          product_id: product.id,
          quantity: item.quantity,
          price_at_purchase: product.price,
        },
        {
          transaction,
        },
      );

      // Remove Product From Cart
      await Cart.destroy({
        where: {
          buyer_id: buyer.id,
          product_id: product.id,
        },
        transaction,
      });

      orders.push(order);
    }

    await transaction.commit();

    const sellerOrders = {};

    for (const order of orders) {
      const product = await Product.findByPk(order.product_id);

      const seller = await User.findByPk(order.seller_id);

      if (!sellerOrders[seller.id]) {
        sellerOrders[seller.id] = {
          sellerEmail: seller.email,

          sellerName: seller.name,

          products: [],
        };
      }

      sellerOrders[seller.id].products.push({
        title: product.title,

        quantity: order.quantity,

        price: product.price,
      });
    }

    for (const sellerId in sellerOrders) {
      const seller = sellerOrders[sellerId];

      await sendOrderMail({
        sellerEmail: seller.sellerEmail,

        sellerName: seller.sellerName,

        buyer,

        products: seller.products,

        paymentMethod: "ONLINE",
      });
    }

    res.json({
      success: true,
      orders,
    });
  } catch (err) {
    await transaction.rollback();

    console.error("Batch Purchase Error:", err);

    res.status(500).json({
      error: "Checkout failed",
    });
  }
});
// ======================================================
// BUYER ORDERS
// ======================================================

router.get("/orders/buyer", auth, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        buyer_id: req.user.id,
      },
      include: [
        {
          model: Product,
          as: "product",
        },
        {
          model: User,
          as: "seller",
          attributes: ["name", "email"],
        },
      ],
      order: [["date", "DESC"]],
    });

    res.json(orders);
  } catch (err) {
    console.error("Buyer Orders Error:", err);

    res.status(500).json({
      error: "Failed to fetch buyer orders",
    });
  }
});

// ======================================================
// SELLER ORDERS
// ======================================================

router.get("/orders/seller", auth, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: {
        seller_id: req.user.id,
      },
      include: [
        {
          model: Product,
          as: "product",
        },
        {
          model: User,
          as: "buyer",
          attributes: ["name", "email"],
        },
      ],
      order: [["date", "DESC"]],
    });

    res.json(orders);
  } catch (err) {
    console.error("Seller Orders Error:", err);

    res.status(500).json({
      error: "Failed to fetch seller orders",
    });
  }
});

// ======================================================
// DOWNLOAD INVOICE PDF
// ======================================================

router.get("/bill/:id", auth, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: Product,
          as: "product",
        },
        {
          model: User,
          as: "buyer",
        },
        {
          model: User,
          as: "seller",
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.setHeader("Content-Type", "application/pdf");

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    doc.pipe(res);

    // Header
    doc.fillColor("#16a34a").fontSize(22).text("Farm Market Invoice", {
      align: "center",
    });

    doc.moveDown();

    doc
      .fillColor("black")
      .fontSize(12)
      .text(`Invoice ID : ${order.id}`)
      .text(`Date : ${new Date(order.date).toLocaleString()}`);

    doc.moveDown();

    // Buyer
    doc
      .fontSize(15)
      .text("Buyer Details")
      .fontSize(12)
      .text(`Name : ${order.buyer.name}`)
      .text(`Email : ${order.buyer.email}`)
      .text(`Address : ${order.buyer.address || "-"}`)
      .text(`Mobile : ${order.buyer.mobile || "-"}`);

    doc.moveDown();

    // Seller
    doc
      .fontSize(15)
      .text("Seller Details")
      .fontSize(12)
      .text(`Name : ${order.seller.name}`)
      .text(`Email : ${order.seller.email}`);

    doc.moveDown();

    // Product
    doc
      .fontSize(15)
      .text("Product Details")
      .fontSize(12)
      .text(`Product : ${order.product.title}`)
      .text(`Price : ₹${order.price_at_purchase.toFixed(2)} / kg`)
      .text(`Quantity : ${order.quantity.toFixed(2)} kg`)
      .text(
        `Total : ₹${(order.price_at_purchase * order.quantity).toFixed(2)}`,
      );

    doc.moveDown(3);

    doc
      .fontSize(11)
      .fillColor("gray")
      .text("Thank you for shopping with Farm Market.", {
        align: "center",
      });

    doc.end();
  } catch (err) {
    console.error("Invoice Error:", err);

    res.status(500).json({
      error: "Failed to generate invoice",
    });
  }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
