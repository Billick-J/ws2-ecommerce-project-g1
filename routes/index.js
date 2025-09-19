const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const user = req.session.user || null;

  const products = [
    { id: 1, image: 'product1.jpg', name: 'Gunpla Starter Set', desc: 'Beginner model kit', price: '₱499' },
    { id: 2, image: 'product2.jpg', name: 'High Grade Kit', desc: 'Detailed 1/144 scale', price: '₱1299' },
    { id: 3, image: 'product3.jpg', name: 'Display Base', desc: 'Pose and display your kits', price: '₱299' },
  ];

  res.render('index', { title: "Nemy's Gunpla & Collectibles", user, products });
});

module.exports = router;