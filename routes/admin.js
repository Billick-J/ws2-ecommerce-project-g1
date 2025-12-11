// routes/admin.js
const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");

// Middleware: Require Admin
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Access denied. Admins only.");
  }
  next();
}

// -------------------------------
// Validation Helper
// -------------------------------
function validateProductInput(body) {
  const errors = [];
  const name = (body.name || "").trim();
  const description = (body.desc || "").trim();
  const category = (body.category || "").trim();
  const priceRaw = (body.price || "").toString().trim();
  const price = Number(priceRaw);

  if (!name) {
    errors.push("Product name is required.");
  } else if (name.length < 2) {
    errors.push("Product name must be at least 2 characters.");
  }

  if (!description) {
    errors.push("Description is required.");
  } else if (description.length < 5) {
    errors.push("Description must be at least 5 characters.");
  }

  if (!priceRaw) {
    errors.push("Price is required.");
  } else if (Number.isNaN(price)) {
    errors.push("Price must be a valid number.");
  } else if (price <= 0) {
    errors.push("Price must be greater than 0.");
  }

  if (!category) {
    errors.push("Category is required.");
  }

  const formData = { name, desc: description, price: priceRaw, category };
  return { errors, formData, priceNumber: price };
}

// -------------------------------
// Admin Dashboard
// -------------------------------
router.get("/", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const users = await db.collection("users").find().toArray();
    res.render("admin-dashboard", { title: "Admin Dashboard", users });
  } catch (err) {
    console.error("Admin error:", err);
    res.send("Unable to load admin dashboard.");
  }
});

// -------------------------------
// Products List with success/error messages
// -------------------------------
// GET /admin/products – list products with messages and search
// GET /admin/products – list products with messages and search
router.get("/products", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const productsCollection = db.collection("products");

    // --- Search filters ---
    const searchName = (req.query.searchName || "").trim();
    const searchCategory = (req.query.searchCategory || "").trim();

    const query = {};
    if (searchName) {
      query.name = { $regex: searchName, $options: "i" };
    }
    if (searchCategory) {
      query.category = searchCategory;
    }

    // Fetch products
    const products = await productsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch all unique categories
    const categories = (await productsCollection.distinct("category")).filter(c => c);

    // Messages
    const { success, action, error } = req.query;
    let message = null;
    if (success === "1" && action === "created") message = { type: "success", text: "Product created successfully." };
    else if (success === "1" && action === "updated") message = { type: "success", text: "Product updated successfully." };
    else if (success === "1" && action === "deleted") message = { type: "success", text: "Product deleted successfully." };
    else if (error === "cannot_delete_used") message = { type: "error", text: "Cannot delete this product because it is already used in one or more orders." };

    res.render("admin-products", {
      title: "Admin – Products",
      products,
      message,
      searchName,
      searchCategory,
      categories // pass categories to EJS
    });
  } catch (err) {
    console.error("Error loading products:", err);
    res.status(500).send("Error loading products.");
  }
});


// -------------------------------
// Add Product Form
// -------------------------------
router.get("/products/new", requireAdmin, (req, res) => {
  res.render("admin-product-new", { 
    title: "Add Product",
    errors: [],
    formData: {}
  });
});


// -------------------------------
// Add Product POST (with validation & images)
// -------------------------------
router.post(
  "/products/new",
  requireAdmin,
  (req, res, next) => req.app.locals.upload.array("images", 15)(req, res, next),
  async (req, res) => {
    try {
      const db = req.app.locals.client.db(req.app.locals.dbName);
      const { errors, formData, priceNumber } = validateProductInput(req.body);

      if (errors.length > 0) {
        return res.status(400).render("admin-product-new", {
          title: "Add Product",
          errors,
          formData
        });
      }

      const imagePaths = req.files?.length
        ? req.files.map(f => "/uploads/" + f.filename)
        : ["/images/default-product.jpeg"];

      await db.collection("products").insertOne({
        name: formData.name,
        desc: formData.desc,
        price: priceNumber,
        category: formData.category,
        images: imagePaths,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.redirect("/admin/products?success=1&action=created");
    } catch (err) {
      console.error("Error adding product:", err);
      res.status(500).send("Error adding product");
    }
  }
);

// -------------------------------
// Edit Product Form
// -------------------------------
router.get("/products/edit/:id", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const product = await db
      .collection("products")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Filter images: if missing on disk, replace with default
    if (product.images && product.images.length > 0) {
      product.images = product.images.map(imgPath => {
        const fullPath = path.join(__dirname, "..", "public", imgPath.replace(/^\//, ""));
        return fs.existsSync(fullPath) ? imgPath : "/images/default-product.jpeg";
      });
    }

    // Pass default values for errors and formData
    res.render("admin-product-edit", {
      title: "Edit Product",
      product,
      errors: [],
      formData: {}
    });
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Error loading edit form");
  }
});


// -------------------------------
// Edit Product POST (with validation & images)
// -------------------------------
router.post(
  "/products/edit/:id",
  requireAdmin,
  (req, res, next) => req.app.locals.upload.array("images", 10)(req, res, next),
  async (req, res) => {
    try {
      const db = req.app.locals.client.db(req.app.locals.dbName);
      const existingProduct = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
      if (!existingProduct) return res.status(404).send("Product not found");

      const { errors, formData, priceNumber } = validateProductInput(req.body);
      if (errors.length > 0) {
        return res.status(400).render("admin-product-edit", {
          title: "Edit Product",
          errors,
          formData,
          productId: req.params.id,
          product: existingProduct
        });
      }

      let newImages = existingProduct.images || [];
      if (req.files?.length) {
        const uploaded = req.files.map(f => "/uploads/" + f.filename);
        newImages = [...newImages, ...uploaded];
      }
      newImages = newImages.filter(img => img !== "/images/default-product.jpeg");

      await db.collection("products").updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: {
          name: formData.name,
          desc: formData.desc,
          price: priceNumber,
          category: formData.category,
          images: newImages,
          updatedAt: new Date()
        } }
      );

      res.redirect("/admin/products?success=1&action=updated");
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(500).send("Error updating product");
    }
  }
);

/// -------------------------------
// Delete Product – Safe Delete
// -------------------------------
router.post("/products/delete/:id", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const productsCollection = db.collection("products");
    const ordersCollection = db.collection("orders");
    const productId = req.params.id;
    const productObjectId = new ObjectId(productId);

    // Check if this productId is used in any order items
    const orderUsingProduct = await ordersCollection.findOne({
      "items.productId": productObjectId
    });

    if (orderUsingProduct) {
      // Product is used in at least one order – do not delete
      return res.redirect("/admin/products?error=cannot_delete_used");
    }

    // Safe to delete – no orders found with this product
    const product = await productsCollection.findOne({ _id: productObjectId });
    if (product?.images) {
      product.images.forEach(img => {
        const fullPath = path.join(__dirname, "..", "public", img.replace(/^\//, ""));
        fs.unlink(fullPath, err => err && console.warn("Could not delete file:", fullPath, err));
      });
    }

    await productsCollection.deleteOne({ _id: productObjectId });

    res.redirect("/admin/products?success=1&action=deleted");
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).send("Error deleting product");
  }
});

// -------------------------------
// Delete a single image from a product
// -------------------------------
router.post("/products/delete-image/:id/:image", requireAdmin, async (req, res) => {
  try {
    const image = decodeURIComponent(req.params.image);
    if (!image) return res.status(400).send("No image specified for deletion");

    const db = req.app.locals.client.db(req.app.locals.dbName);
    const fullPath = path.join(__dirname, "..", "public", image.replace(/^\//, ""));
    fs.unlink(fullPath, err => err && console.warn("Could not delete file:", fullPath, err));

    await db.collection("products").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { images: image }, $set: { updatedAt: new Date() } }
    );

    res.redirect(`/admin/products/edit/${req.params.id}`);
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).send("Error deleting image");
  }
});

// -------------------------------
// Admin Orders List
// -------------------------------
router.get("/orders", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const orders = await db.collection("orders").find().toArray();
    res.render("admin-orders", { title: "Admin Orders", orders });
  } catch (err) {
    console.error("Error loading orders:", err);
    res.status(500).send("Unable to load orders.");
  }
});

// -------------------------------
// Admin Order Details
// -------------------------------
router.get("/orders/:id", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const orderId = req.params.id;

    if (!ObjectId.isValid(orderId)) {
      return res.status(400).send("Invalid order ID");
    }

    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });

    if (!order) return res.status(404).send("Order not found");

    res.render("admin-orders-details", { title: "Order Details", order });
  } catch (err) {
    console.error("Error loading order:", err);
    res.status(500).send("Unable to load order.");
  }
});


module.exports = router;
