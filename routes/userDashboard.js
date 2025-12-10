const express = require("express");
const router = express.Router();
const requireLogin = require("../middleware/requireLogin");

// GET /user/dashboard – existing dashboard route (keep as is)
router.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const ordersCollection = db.collection("orders");
    const user = req.session.user;

    const userOrders = await ordersCollection
      .find({ userId: user.userId })
      .toArray();

    const statusCounts = {
      to_pay: 0,
      to_ship: 0,
      to_receive: 0,
      completed: 0,
      refund: 0,
      cancelled: 0
    };

    userOrders.forEach(order => {
      if (statusCounts[order.orderStatus] !== undefined) {
        statusCounts[order.orderStatus] += 1;
      }
    });

    const totalOrders = userOrders.length;

    res.render("user-dashboard", {
      user,
      title: "Dashboard",
      totalOrders,
      statusCounts
    });
  } catch (err) {
    console.error("Error loading user dashboard:", err);
    res.status(500).send("Error loading dashboard.");
  }
});

// GET /user/profile – view profile
router.get("/profile", requireLogin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection("users");
    const userFromSession = req.session.user;

    // Load latest user info from DB
    const user = await usersCollection.findOne({ userId: userFromSession.userId });
    const updated = req.query.updated === "1";

    res.render("user-profile", {
      title: "User Profile",
      user,
      updated
    });
  } catch (err) {
    console.error("Error loading user profile:", err);
    res.status(500).send("Error loading profile.");
  }
});

// POST /user/profile – update profile
router.post("/profile", requireLogin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const usersCollection = db.collection("users");
    const userFromSession = req.session.user;

    // Trim inputs
    const firstName = (req.body.firstName || "").trim();
    const lastName = (req.body.lastName || "").trim();
    const address = (req.body.address || "").trim();
    const contactNumber = (req.body.contactNumber || "").trim();

    const updates = {};

    // Only update if the value is different from session
    if (firstName !== userFromSession.firstName) updates.firstName = firstName;
    if (lastName !== userFromSession.lastName) updates.lastName = lastName;
    if (address !== (userFromSession.address || "")) updates.address = address;
    if (contactNumber !== (userFromSession.contactNumber || "")) updates.contactNumber = contactNumber;

    // Only perform update if there is something to update
    if (Object.keys(updates).length > 0) {
      await usersCollection.updateOne(
        { userId: userFromSession.userId },
        { $set: updates }
      );

      // Update session
      Object.assign(req.session.user, updates);
    }

    res.redirect("/user/profile?updated=1");
  } catch (err) {
    console.error("Error updating user profile:", err);
    res.status(500).send("Error updating profile.");
  }
});


// GET /user/orders – purchase history for the logged-in user
router.get("/orders", requireLogin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const ordersCollection = db.collection("orders");
    const userFromSession = req.session.user;

    // Load all orders for this user
    const userOrders = await ordersCollection
      .find({ userId: userFromSession.userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Group orders by status
    const ordersByStatus = {
      to_pay: [],
      to_ship: [],
      to_receive: [],
      completed: [],
      refund: [],
      cancelled: []
    };

    userOrders.forEach(order => {
      const status = order.orderStatus;
      if (ordersByStatus[status]) {
        ordersByStatus[status].push(order);
      }
    });

    res.render("user-orders", {
      title: "My Orders",
      user: userFromSession,
      ordersByStatus
    });
  } catch (err) {
    console.error("Error loading user orders:", err);
    res.status(500).send("Error loading orders.");
  }
});


module.exports = router;
