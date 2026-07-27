const { auth } = require("../firebaseAdmin");
const { User } = require("../models");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Unauthorized - No Authorization header",
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        error: "Unauthorized - Invalid token format",
      });
    }

    const idToken = parts[1];

    // Verify Firebase ID Token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Find user in MySQL
    const user = await User.findOne({
      where: {
        firebaseUid: decodedToken.uid,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized - User not found",
      });
    }

    // Attach data for use in protected routes
    req.user = user;
    req.firebaseUser = decodedToken;

    next();
  } catch (error) {
    console.error("Firebase Auth Error:", error);

    return res.status(401).json({
      error: "Unauthorized",
    });
  }
};