const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { User } = require("../models");
const bcrypt = require("bcryptjs");
const upload = require("../middleware/upload");

// Update profile with name/email and password change securely
router.put("/profile", auth, upload.single("picture"), async (req, res) => {
  try {
    const {
      name,
      email,
      currentPassword,
      newPassword,
      address,
      district,
      state,
      pin,
      mobile,
    } = req.body;

    const pictureUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const user = await User.findByPk(req.user.id);

    // if user wants to update password, verify currentPassword
    if (currentPassword && newPassword) {
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // update name and email if provided
    if (name) user.name = name;
    if (email) user.email = email;

    // update address/contact
    user.address = address !== undefined ? address : user.address;
    user.district = district !== undefined ? district : user.district;
    user.state = state !== undefined ? state : user.state;
    user.pin = pin !== undefined ? pin : user.pin;
    user.mobile = mobile !== undefined ? mobile : user.mobile;
    if (pictureUrl) {
      user.picture = pictureUrl;
    }

    await user.save();

    // remove password in response
    const { password: pwd, ...updated } = user.toJSON();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
