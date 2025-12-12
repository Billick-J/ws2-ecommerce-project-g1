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

router.get("/checkout", requireLogin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const userId = req.session.user.userId;

    // Parse selected items
    const itemsRaw = req.query.items;
    if (!itemsRaw) return res.redirect("/cart");

    const selectedItems = JSON.parse(itemsRaw); // [{ productId, quantity }]

    // Convert productIds to ObjectId
    const productObjectIds = selectedItems.map(i => new ObjectId(i.productId));

    // Fetch product details by _id
    const products = await db.collection("products")
      .find({ _id: { $in: productObjectIds } })
      .toArray();

    // Merge product details with quantities
    const finalItems = selectedItems.map(sel => {
      const prod = products.find(p => p._id.toString() === sel.productId);

      if (!prod) {
        console.error("Product not found:", sel.productId);
        return null;
      }

      return {
        productId: sel.productId,
        name: prod.name,
        price: prod.price,
        quantity: sel.quantity,
        subtotal: prod.price * sel.quantity
      };
    }).filter(Boolean);

    const totalAmount = finalItems.reduce((sum, i) => sum + i.subtotal, 0);

    // Load user info
    const user = await db.collection("users").findOne({ userId });

    res.render("checkout", {
      title: "Checkout",
      items: finalItems,
      totalAmount,
      user,
      address: user.address || "",
      contactNumber: user.contactNumber || ""
    });

  } catch (err) {
    console.error("Error loading checkout:", err);
    res.status(500).send("Error loading checkout page");
  }
});


// POST /orders/checkout – create a new order (partial checkout supported)
router.post("/checkout", requireLogin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection("users");
    const productsCollection = db.collection("products");
    const ordersCollection = db.collection("orders");
    const { payment, address, phoneNumber } = req.body;

    // Validate address, phone number, and payment method
    if (!address || address.trim() === "") {
      return res.status(400).send("Please provide a delivery address.");
    }

    if (!phoneNumber || phoneNumber.trim() === "") {
      return res.status(400).send("Please provide a phone number.");
    }

    if (payment !== "cod" && payment !== "cop") {
      return res.status(400).send("Invalid payment method. Please choose COD or COP.");
    }

    const user = await usersCollection.findOne({ userId: req.session.user.userId });
    if (!user) return res.status(404).send("User not found.");

    // Items submitted for checkout (from the form)
    const selectedItems = req.body.items ? JSON.parse(req.body.items) : [];
    if (!selectedItems.length) return res.status(400).send("No items selected for checkout.");

    // Fetch product details for the selected items
    const productIds = selectedItems.map(item => new ObjectId(item.productId));
    const products = await productsCollection.find({ _id: { $in: productIds } }).toArray();

    // Build order items and calculate total
    let totalAmount = 0;
    const orderItems = selectedItems.map(sel => {
      const product = products.find(p => p._id.equals(sel.productId));
      if (!product) return null;

      const quantity = parseInt(sel.quantity, 10) || 1;
      const subtotal = product.price * quantity;
      totalAmount += subtotal;

      return {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity,
        subtotal
      };
    }).filter(Boolean);

    if (!orderItems.length) return res.status(400).send("Selected items not found in products.");

    // Add to newOrder
    const newOrder = {
      orderId: uuidv4(),
      userId: user.userId,
      userEmail: user.email,
      items: orderItems,
      totalAmount,
      orderStatus: "to_pay",
      paymentMethod: payment,
      deliveryAddress: address || user.address || "",
      phoneNumber: phoneNumber || user.contactNumber || "",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await ordersCollection.insertOne(newOrder);

    // Remove purchased items from user's cart in DB
    const remainingCart = user.cart.filter(
      c => !selectedItems.some(sel => sel.productId === c.productId)
    );
    await usersCollection.updateOne(
      { userId: user.userId },
      { $set: { cart: remainingCart } }
    );

    // Update session cart as well
    req.session.cart = remainingCart;
    req.session.save(() => {
      res.redirect(`/orders/confirmation/${newOrder.orderId}`);
    });

  } catch (err) {
    console.error("Error during checkout:", err);
    res.status(500).send("Error placing order.");
  }
});




module.exports = router;