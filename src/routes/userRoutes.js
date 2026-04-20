const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

// protected route
router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route accessed ✅",
    user: req.user
  });
});

module.exports = router;