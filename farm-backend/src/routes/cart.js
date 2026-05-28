const express = require("express");
const router = express.Router();

const { Cart, Product } = require("../models");
const auth = require("../middleware/auth");

// ADD TO CART
router.post("/add", auth, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    let item = await Cart.findOne({
      where: {
        buyer_id: req.user.id,
        product_id
      }
    });

    if (item) {
      item.quantity += quantity;
      await item.save();
    } else {
      item = await Cart.create({
        buyer_id: req.user.id,
        product_id,
        quantity
      });
    }

    res.json({ message: "Added to cart" });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Cart add failed" });
  }
});

// GET CART ITEMS
router.get("/", auth, async (req, res) => {
  try {
    const items = await Cart.findAll({
      where: { buyer_id: req.user.id },
      include: [
        {
          model: Product,
          as: "product"
        }
      ]
    });

    res.json(items);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// REMOVE FROM CART
router.delete("/:id", auth, async (req, res) => {
  try {
    await Cart.destroy({
      where: {
        id: req.params.id,
        buyer_id: req.user.id
      }
    });

    res.json({ message: "Removed from cart" });
  } catch (err) {
    console.error("Remove cart error:", err);
    res.status(500).json({ error: "Remove failed" });
  }
});

module.exports = router;
