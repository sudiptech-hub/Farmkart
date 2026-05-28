const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Product = sequelize.define("Product", {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },

  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  image_url: {
    type: DataTypes.STRING,
    allowNull: true
  },

  seller_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

module.exports = Product;