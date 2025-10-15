const express = require('express');
const router = express.Router();

const products = [
  {
    id: 1,
    image: '/pp/calibarn/calibarn_box.jpeg',  // Main image for listing page
    images: [  // Additional images for the slider
      '/pp/calibarn/calibarn_1.jpeg',
      '/pp/calibarn/calibarn_2.jpeg',
      '/pp/calibarn/calibarn_3.jpeg',
    ],
    name: 'Gunpla Starter Set',
    desc: 'Beginner model kit',
    price: '₱499',
    details: 'Includes basic tools and an easy 1/144 model for new builders.'
  },
  {
    id: 2,
    image: '/pp/aerial/aerial_box.jpeg',
    images: [
      '/pp/aerial/aerial_1.jpeg',
      '/pp/aerial/aerial_2.jpeg',
      '/pp/aerial/aerial_3.jpeg'
    ],
    name: 'High Grade Kit',
    desc: 'Detailed 1/144 scale',
    price: '₱1299',
    details: 'Great articulation for posing and display.'
  },

  {
    id: 3,
    image: '/pp/aerial_rebuild/aerial_rebuild_box.jpeg',
    images: [
      '/pp/aerial_rebuild/aerial_rebuild_1.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_2.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_3.jpeg'
    ],
    name: 'Display Base',
    desc: 'Pose and display your kits',
    price: '₱299',
    details: 'Sturdy adjustable base for displaying Gunpla models.'
  }
  // More products here
];




// 🏠 Home route
router.get('/', (req, res) => {
  const user = req.session.user || null;
  res.render('index', { title: "Nemy's Gunpla & Collectibles", user, products });
});

// 🛒 Products page — shows all products
router.get('/products', (req, res) => {
  const user = req.session.user || null;
  res.render('products', { title: "Our Products", user, products });
});

// 📦 Product details page — shows one product by ID
router.get('/products/:id', (req, res) => {
  const user = req.session.user || null;
  const { id } = req.params;

  const product = products.find(p => p.id == id);
  if (!product) {
    return res.status(404).render('500', { title: 'Product Not Found', user });
  }

  res.render('product-details', { title: product.name, user, product });
});

// ℹ️ About page
router.get('/about', (req, res) => {
  const user = req.session.user || null;
  res.render('about', { title: "About Us", user });
});

// ✉️ Contact page
router.get('/contact', (req, res) => {
  const user = req.session.user || null;
  res.render('contact', { title: "Contact Us", user });
});

module.exports = router;
