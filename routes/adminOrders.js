// routes/adminOrders.js
const express = require("express");
const router = express.Router();

const requireAdmin = require("../middleware/requireAdmin");

// GET /admin/orders – list all orders
router.get("/", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const ordersCollection = db.collection("orders");

    const orders = await ordersCollection.find().toArray();

    res.render("admin-orders", { title: "All Orders", orders });
  } catch (err) {
    console.error("Error loading orders:", err);
    res.status(500).send("Error loading orders.");
  }
});

// GET /admin/orders/:orderId – view details of a single order
router.get("/:orderId", requireAdmin, async (req, res) => {
  try {
    const id = req.params.orderId;
    console.log("adminOrders: requested id =", id);

    const db = req.app.locals.client.db(req.app.locals.dbName);
    const ordersCollection = db.collection("orders");

    // try by orderId field first
    let order = await ordersCollection.findOne({ orderId: id });

    // fallback to Mongo _id if not found
    const { ObjectId } = require("mongodb");
    if (!order && ObjectId.isValid(id)) {
      order = await ordersCollection.findOne({ _id: new ObjectId(id) });
    }

    if (!order) {
      console.warn("adminOrders: order not found for id =", id);
      return res.status(404).send("Order not found.");
    }

    res.render("admin-orders-details", { title: "Order Details", order });
  } catch (err) {
    console.error("Error loading order details:", err);
    res.status(500).send("Error loading order details.");
  }
});

module.exports = router;