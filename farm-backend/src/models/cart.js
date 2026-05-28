const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Cart = sequelize.define(
  "Cart",
  {
    buyer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  },
  {
    timestamps: false
  }
);

module.exports = Cart;
