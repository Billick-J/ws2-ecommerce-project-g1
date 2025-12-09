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
// Admin Dashboard
// -------------------------------
router.get("/", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const users = await db.collection("users").find().toArray();
    res.render("admin", { title: "Admin Dashboard", users });
  } catch (err) {
    console.error("Admin error:", err);
    res.send("Unable to load admin dashboard.");
  }
});

// -------------------------------
// Products List
// -------------------------------
router.get("/products", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const products = await db.collection("products").find().toArray();
    res.render("admin-products", { title: "Admin Products", products });
  } catch (err) {
    console.error("Error loading products:", err);
    res.status(500).send("Unable to load products.");
  }
});

// -------------------------------
// Add Product Form
// -------------------------------
router.get("/products/new", requireAdmin, (req, res) => {
  res.render("admin-product-new", { title: "Add Product" });
});

// -------------------------------
// Add Product POST (MULTI IMAGE)
// -------------------------------
router.post(
  "/products/new",
  requireAdmin,
  (req, res, next) => {
    req.app.locals.upload.array("images", 15)(req, res, next);
  },
  async (req, res) => {
    try {
      const db = req.app.locals.client.db(req.app.locals.dbName);
      const imagePaths = req.files ? req.files.map(f => "/uploads/" + f.filename) : [];
      const { name, desc, price } = req.body;
      const priceNum = parseFloat(price);

      await db.collection("products").insertOne({
        name,
        desc,
        price: priceNum,
        images: imagePaths,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.redirect("/admin/products");
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
        if (fs.existsSync(fullPath)) {
          return imgPath;
        } else {
          return "/images/default-product.jpeg";
        }
      });
    }

    res.render("admin-product-edit", { title: "Edit Product", product });
  } catch (err) {
    console.error("Error loading edit form:", err);
    res.status(500).send("Error loading edit form");
  }
});

// -------------------------------
// Edit Product POST (MULTI IMAGE)
// -------------------------------
router.post(
  "/products/edit/:id",
  requireAdmin,
  (req, res, next) => {
    req.app.locals.upload.array("images", 10)(req, res, next);
  },
  async (req, res) => {
    try {
      const db = req.app.locals.client.db(req.app.locals.dbName);
      const existingProduct = await db.collection("products")
        .findOne({ _id: new ObjectId(req.params.id) });

      if (!existingProduct) return res.status(404).send("Product not found");

      let newImages = existingProduct.images || [];
      if (req.files?.length) {
        const uploaded = req.files.map(f => "/uploads/" + f.filename);
        newImages = [...newImages, ...uploaded];
      }

      // Make sure default placeholder is filtered consistently
      newImages = newImages.filter(img => img !== "/images/default-product.jpeg");

      const { name, desc, price } = req.body;
      const priceNum = parseFloat(price); 
      await db.collection("products").updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { name, desc, price: priceNum, images: newImages, updatedAt: new Date() } }
      );

      res.redirect("/admin/products");
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(500).send("Error updating product");
    }
  }
);


// -------------------------------
// Delete Product
// -------------------------------
router.post("/products/delete/:id", requireAdmin, async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const product = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });

    if (product?.images) {
      product.images.forEach(img => {
        const fullPath = path.join(__dirname, "..", "public", img.replace(/^\//, ""));
        fs.unlink(fullPath, err => {
          if (err) {
            console.warn("Could not delete file:", fullPath, err);
          } else {
            console.log("Deleted file:", fullPath);
          }
        });
      });
    }

    await db.collection("products").deleteOne({ _id: new ObjectId(req.params.id) });
    res.redirect("/admin/products");
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
    console.log("Delete image param:", image);

    if (!image) {
      return res.status(400).send("No image specified for deletion");
    }

    const db = req.app.locals.client.db(req.app.locals.dbName);

    const fullPath = path.join(__dirname, "..", "public", image.replace(/^\//, ""));
    fs.unlink(fullPath, err => {
      if (err) {
        console.warn("Could not delete file:", fullPath, err);
      } else {
        console.log("Deleted file from disk:", fullPath);
      }
    });

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

module.exports = router;
