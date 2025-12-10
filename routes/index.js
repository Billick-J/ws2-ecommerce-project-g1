const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// 🏠 Home route — optionally show featured products
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const products = await db.collection('products').find().toArray();

    res.render('index', {
      title: "Nemy's Gunpla & Collectibles",
      user: req.session.user || null,
      products
    });
  } catch (err) {
    console.error("Failed to load home page products:", err);
    res.render('index', { 
      title: "Nemy's Gunpla & Collectibles", 
      user: req.session.user || null, 
      products: [] 
    });
  }
});

// 🛒 Products page — shows all products
router.get('/products', async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const products = await db.collection('products').find().toArray();

    res.render('products', {
      title: "Our Products",
      user: req.session.user || null,
      products
    });
  } catch (err) {
    console.error("Failed to load products page:", err);
    res.render('products', { title: "Our Products", user: req.session.user || null, products: [] });
  }
});

// 📦 Product details page — shows one product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const db = req.app.locals.client.db(req.app.locals.dbName);
    const product = await db.collection('products').findOne({ _id: new ObjectId(req.params.id) });

    if (!product) {
      return res.status(404).render('500', { title: 'Product Not Found', user: req.session.user || null });
    }

    res.render('product-details', {
      title: product.name,
      user: req.session.user || null,
      product
    });
  } catch (err) {
    console.error("Failed to load product details:", err);
    res.status(500).render('500', { title: "Product Error", user: req.session.user || null });
  }
});

// ℹ️ About page
router.get('/about', (req, res) => {
  res.render('about', {
    title: "About Nemy's Gunpla & Collectibles — Gunpla Kits & Model Shop",
    name: "Nemy's Gunpla & Collectibles",
    description: "Your one-stop shop for Gunpla model kits and collectibles, offering detailed models, accessories, and expert guidance for hobbyists of all skill levels.",
    user: req.session.user || null
  });
});

// ✉️ Contact page
router.get('/contact', (req, res) => {
  res.render('contact', { title: "Contact Us", user: req.session.user || null });
});

module.exports = router;
