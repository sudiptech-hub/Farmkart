const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false
    },

    role: {
      type: DataTypes.STRING, // buyer | seller
      allowNull: false
    },

    address: DataTypes.STRING,
    district: DataTypes.STRING,
    state: DataTypes.STRING,
    pin: DataTypes.STRING,
    mobile: DataTypes.STRING
  },
  {
    timestamps: false   // ✅ IMPORTANT LINE
  }
);

module.exports = User;