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
router.get("/", async (req, res) => {
  try {
    let cart = req.session.cart || [];

    // if cart is empty, render early
    if (!cart || cart.length === 0) {
      return res.render("cart", { title: "Your Cart", cart: [] });
    }

    // fetch product details for each cart item
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const productsCollection = db.collection("products");
    const { ObjectId } = require("mongodb");

    const enrichedCart = await Promise.all(
      cart.map(async (item) => {
        const product = await productsCollection.findOne({
          _id: new ObjectId(item.productId)
        });
        return {
          productId: item.productId,
          name: product?.name || "Unknown Product",
          price: product?.price || 0,
          quantity: item.quantity
        };
      })
    );

    res.render("cart", { title: "Your Cart", cart: enrichedCart });
  } catch (err) {
    console.error("Error rendering cart:", err);
    res.status(500).send("Error loading cart.");
  }
});

// Remove item from cart
router.post("/remove", (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart = req.session.cart.filter(item => item.productId !== productId);
  req.session.save(() => res.json({ success: true }));
});

// Update quantity
router.post("/update-quantity", (req, res) => {
  const { productId, quantity } = req.body;
  if (!req.session.cart) req.session.cart = [];

  req.session.cart = req.session.cart.map(item => {
    if (item.productId === productId) {
      return { ...item, quantity: Math.max(1, parseInt(quantity, 10)) };
    }
    return item;
  });

  req.session.save(() => res.json({ success: true }));
});


module.exports = router;