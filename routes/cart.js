// routes/cart.js
const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

// Add item to cart
router.post("/add", async (req, res) => {
  const { productId, quantity } = req.body;
  const db = req.app.locals.client.db(req.app.locals.dbName);
  const usersCollection = db.collection("users");

  if (!req.session.user) return res.status(401).send("Not logged in");

  // Add or update item in user's cart
  const userId = req.session.user.userId;
  const user = await usersCollection.findOne({ userId });

  const existingItem = user.cart?.find(c => c.productId === productId);

  if (existingItem) {
    existingItem.quantity += parseInt(quantity, 10) || 1;
  } else {
    if (!user.cart) user.cart = [];
    user.cart.push({ productId, quantity: parseInt(quantity, 10) || 1 });
  }

  await usersCollection.updateOne({ userId }, { $set: { cart: user.cart } });
  res.redirect("/cart");
});

// Show cart page
router.get("/", async (req, res) => {
  if (!req.session.user) return res.status(401).send("Not logged in");

  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection("users");
    const productsCollection = db.collection("products");

    const userId = req.session.user.userId;
    const user = await usersCollection.findOne({ userId });

    const cart = user.cart || [];

    if (!cart.length) {
      return res.render("cart", { title: "Your Cart", cart: [] });
    }

    // fetch product details for each cart item
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
router.post("/remove", async (req, res) => {
  if (!req.session.user) return res.status(401).send("Not logged in");

  const { productId } = req.body;
  const db = req.app.locals.client.db(req.app.locals.dbName);
  const usersCollection = db.collection("users");

  const userId = req.session.user.userId;
  const user = await usersCollection.findOne({ userId });

  if (!user.cart) user.cart = [];
  user.cart = user.cart.filter(item => item.productId !== productId);

  await usersCollection.updateOne({ userId }, { $set: { cart: user.cart } });
  res.json({ success: true });
});

// Update quantity
router.post("/update-quantity", async (req, res) => {
  if (!req.session.user) return res.status(401).send("Not logged in");

  const { productId, quantity } = req.body;
  const db = req.app.locals.client.db(req.app.locals.dbName);
  const usersCollection = db.collection("users");

  const userId = req.session.user.userId;
  const user = await usersCollection.findOne({ userId });

  if (!user.cart) user.cart = [];
  user.cart = user.cart.map(item => {
    if (item.productId === productId) {
      return { ...item, quantity: Math.max(1, parseInt(quantity, 10)) };
    }
    return item;
  });

  await usersCollection.updateOne({ userId }, { $set: { cart: user.cart } });
  res.json({ success: true });
});

module.exports = router;
