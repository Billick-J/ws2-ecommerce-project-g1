// routes/cart.js
const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

// Add item to cart
router.post("/add", async (req, res) => {
  console.log("POST /cart/add received, body:", req.body); // debug
  const { productId, quantity } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart.push({ productId, quantity: parseInt(quantity, 10) || 1 });
  req.session.save(() => {
    res.redirect("/cart"); // or send JSON
  });
});

// Show cart page
router.get("/", (req, res) => {
  const cart = req.session.cart || [];
  res.render("cart", { title: "Your Cart", cart });
});

module.exports = router;