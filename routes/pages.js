const express = require('express');
const router = express.Router();

router.get('/products', (req, res) => {
  const user = req.session.user || null;

  const items = [
    { id:1, image:'product1.jpg', name:'Gunpla Starter Set', desc:'Beginner model kit', price:'₱499' },
    { id:2, image:'product2.jpg', name:'High Grade Kit', desc:'Detailed 1/144 scale', price:'₱1299' },
    { id:3, image:'product3.jpg', name:'Display Base', desc:'Pose and display your kits', price:'₱299' },
    { id:4, image:'product1.jpg', name:'Gunpla Starter Set', desc:'Beginner model kit', price:'₱499' },
    { id:5, image:'product2.jpg', name:'High Grade Kit', desc:'Detailed 1/144 scale', price:'₱1299' },
    { id:6, image:'product3.jpg', name:'Display Base', desc:'Pose and display your kits', price:'₱299' }
  ];

  res.render('products', { title: "Products", user, items });
});

router.get('/about', (req, res) => {
  const user = req.session.user || null;
  res.render('about', { title: "About Us", user });
});

router.get('/contact', (req, res) => {
  const user = req.session.user || null;
  res.render('contact', { title: "Contact Us", user });
});

module.exports = router;