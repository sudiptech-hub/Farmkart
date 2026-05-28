require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/users", require("./routes/users"));
app.use("/api/payment", require("./routes/payment"));

sequelize.sync({ alter: true }).then(() => {
  console.log("DB synced");
  app.listen(4000, () => console.log("Server running on 4000"));
});