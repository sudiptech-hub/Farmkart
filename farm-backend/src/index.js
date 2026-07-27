require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");

// Initialize Firebase Admin
require("./firebaseAdmin");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/users", require("./routes/users"));
app.use("/api/payment", require("./routes/payment"));
app.use("/uploads", express.static("uploads"));

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Farm Backend API is running",
  });
});

// Start Server
sequelize
  .sync()
  .then(() => {
    console.log("✅ Database synced successfully");

    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database sync failed:", err);
  });
