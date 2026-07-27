const express = require("express");
const router = express.Router();

const { Cart, Product, User } = require("../models");
const auth = require("../middleware/auth");

// ======================================
// ADD TO CART
// ======================================
router.post("/add", auth, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({
        error: "Product ID and quantity are required.",
      });
    }

    const product = await Product.findByPk(product_id);

    if (!product) {
      return res.status(404).json({
        error: "Product not found.",
      });
    }

    let item = await Cart.findOne({
      where: {
        buyer_id: req.user.id,
        product_id,
      },
    });

    if (item) {
      const newQty = item.quantity + Number(quantity);

      if (newQty > product.quantity) {
        return res.status(400).json({
          error: `Only ${product.quantity} kg available.`,
        });
      }

      item.quantity = newQty;
      await item.save();
    } else {
      if (Number(quantity) > product.quantity) {
        return res.status(400).json({
          error: `Only ${product.quantity} kg available.`,
        });
      }

      await Cart.create({
        buyer_id: req.user.id,
        product_id,
        quantity: Number(quantity),
      });
    }

    const updatedCart = await Cart.findAll({
      where: {
        buyer_id: req.user.id,
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: User,
              as: "seller",
              attributes: ["name", "email"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(updatedCart);
  } catch (err) {
    console.error("Add to cart error:", err);

    res.status(500).json({
      error: "Cart add failed.",
    });
  }
});

// ======================================
// GET CART
// ======================================
router.get("/", auth, async (req, res) => {
  try {
    const items = await Cart.findAll({
      where: {
        buyer_id: req.user.id,
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: User,
              as: "seller",
              attributes: ["name", "email"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(items);
  } catch (err) {
    console.error("Fetch Cart Error:", err);

    res.status(500).json({
      error: "Failed to fetch cart.",
    });
  }
});

// ======================================
// UPDATE CART QUANTITY
// ======================================
router.put("/:id", auth, async (req, res) => {
  try {
    const { quantity } = req.body;

    const item = await Cart.findOne({
      where: {
        id: req.params.id,
        buyer_id: req.user.id,
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: User,
              as: "seller",
              attributes: ["name", "email"],
            },
          ],
        },
      ],
    });

    if (!item) {
      return res.status(404).json({
        error: "Cart item not found.",
      });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({
        error: "Quantity must be greater than zero.",
      });
    }

    if (Number(quantity) > item.product.quantity) {
      return res.status(400).json({
        error: `Only ${item.product.quantity} kg available.`,
      });
    }

    item.quantity = Number(quantity);

    await item.save();

    const updatedCart = await Cart.findAll({
      where: {
        buyer_id: req.user.id,
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: User,
              as: "seller",
              attributes: ["name", "email"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(updatedCart);
  } catch (err) {
    console.error("Update Cart Error:", err);

    res.status(500).json({
      error: "Failed to update cart.",
    });
  }
});

// ======================================
// REMOVE FROM CART
// ======================================
router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await Cart.findOne({
      where: {
        id: req.params.id,
        buyer_id: req.user.id,
      },
    });

    if (!item) {
      return res.status(404).json({
        error: "Cart item not found.",
      });
    }

    await item.destroy();

    const updatedCart = await Cart.findAll({
      where: {
        buyer_id: req.user.id,
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: User,
              as: "seller",
              attributes: ["name", "email"],
            },
          ],
        },
      ],
      order: [["id", "DESC"]],
    });

    res.json(updatedCart);
  } catch (err) {
    console.error("Remove Cart Error:", err);

    res.status(500).json({
      error: "Failed to remove item.",
    });
  }
});

module.exports = router;
