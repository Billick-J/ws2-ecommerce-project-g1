const express = require('express');
const router = express.Router();

// Home route
router.get('/', (req, res) => {
  const user = req.session.user || null;

  const products = [
    { id: 1, image: '/pp/calibarn_box.jpeg', name: 'Gunpla Starter Set', desc: 'Beginner model kit', price: '₱499' },
    { id: 2, image: 'product2.jpg', name: 'High Grade Kit', desc: 'Detailed 1/144 scale', price: '₱1299' },
    { id: 3, image: 'product3.jpg', name: 'Display Base', desc: 'Pose and display your kits', price: '₱299' },
  ];

  res.render('index', { title: "Nemy's Gunpla & Collectibles", user, products });
});

// Products page — same products, different template
router.get('/products', (req, res) => {
  const user = req.session.user || null;

  const products = [
    { id: 1, image: '/pp/calibarn_box.jpeg', name: 'Gunpla Starter Set', desc: 'Beginner model kit', price: '₱499' },
    { id: 2, image: 'product2.jpg', name: 'High Grade Kit', desc: 'Detailed 1/144 scale', price: '₱1299' },
    { id: 3, image: 'product3.jpg', name: 'Display Base', desc: 'Pose and display your kits', price: '₱299' },
  ];

  res.render('products', { title: "Our Products", user, products });
});

// About page
router.get('/about', (req, res) => {
  const user = req.session.user || null;
  res.render('about', { title: "About Us", user });
});

// Contact page
router.get('/contact', (req, res) => {
  const user = req.session.user || null;
  res.render('contact', { title: "Contact Us", user });
});

module.exports = router;
