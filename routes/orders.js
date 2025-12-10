// routes/orders.js
const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { ObjectId } = require("mongodb");

const requireLogin = require("../middleware/requireLogin");

// Simple test route to confirm router is mounted
router.get("/ping", (req, res) => {
  res.send("Orders route is alive!");
});

// Optional protected test route
router.get("/test-protected", requireLogin, (req, res) => {
  res.send("You are logged in. Protected route works.");
});

// GET /orders/confirmation/:orderId – order confirmation page
router.get("/confirmation/:orderId", requireLogin, async (req, res) => {
  const db = req.app.locals.client.db(req.app.locals.dbName);
  const ordersCollection = db.collection("orders");

  const order = await ordersCollection.findOne({ orderId: req.params.orderId });
  if (!order) return res.status(404).send("Order not found.");

  res.render("order-confirmations", { title: "Order Confirmation", order });
});


// POST /orders/checkout – create a new order
router.post("/checkout", requireLogin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const productsCollection = db.collection("products");
    const ordersCollection = db.collection("orders");
    const user = req.session.user;

    // Use items from body OR session cart
    const itemsFromClient = req.body.items ? JSON.parse(req.body.items) : req.session.cart || [];
    if (!Array.isArray(itemsFromClient) || itemsFromClient.length === 0) {
      return res.status(400).send("No items provided for checkout.");
    }

    const productIds = itemsFromClient.map(item => new ObjectId(item.productId));
    const products = await productsCollection.find({ _id: { $in: productIds } }).toArray();

    const orderItems = itemsFromClient.map((item, idx) => {
      const product = products.find(p => p._id.equals(productIds[idx]));
      const quantity = parseInt(item.quantity, 10) || 1;
      const price = product ? Number(product.price) : 0;
      const subtotal = price * quantity;

      return {
        productId: productIds[idx],
        name: product?.name || "Unknown",
        price,
        quantity,
        subtotal
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const now = new Date();

    const newOrder = {
      orderId: require("uuid").v4(),
      userId: user.userId,
      userEmail: user.email,
      items: orderItems,
      totalAmount,
      orderStatus: "to_pay",
      createdAt: now,
      updatedAt: now
    };

    await ordersCollection.insertOne(newOrder);

    // Clear cart after checkout
    req.session.cart = [];
    req.session.save(() => {
      res.redirect(`/orders/confirmation/${newOrder.orderId}`);
    });
  } catch (err) {
    console.error("Error during checkout:", err);
    res.status(500).send("Error placing order.");
  }
});

module.exports = router;