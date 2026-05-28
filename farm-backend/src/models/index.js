const { sequelize } = require("../config/database");

const User = require("./User");
const Product = require("./Product");
const Order = require("./Order");
const Cart = require("./Cart");

// User ↔ Product
User.hasMany(Product, { foreignKey: "seller_id" });
Product.belongsTo(User, { foreignKey: "seller_id", as: "seller" });

// Order relations
Order.belongsTo(User, { foreignKey: "buyer_id", as: "buyer" });
Order.belongsTo(User, { foreignKey: "seller_id", as: "seller" });
Order.belongsTo(Product, { foreignKey: "product_id", as: "product" });

// Cart
Cart.belongsTo(User, { foreignKey: "buyer_id" });
Cart.belongsTo(Product, { foreignKey: "product_id", as: "product" });

module.exports = {
  sequelize,
  User,
  Product,
  Order,
  Cart
};