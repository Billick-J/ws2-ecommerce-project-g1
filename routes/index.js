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
      '/pp/calibarn/calibarn_4.jpeg',
      '/pp/calibarn/calibarn_5.jpeg',
      '/pp/calibarn/calibarn_6.jpeg',
      '/pp/calibarn/calibarn_7.jpeg',
      '/pp/calibarn/calibarn_8.jpeg',
      '/pp/calibarn/calibarn_9.jpeg',
      '/pp/calibarn/calibarn_10.jpeg'
    ],
    name: 'HG Gundam Calibarn',
    desc: 'a 1/144 scale model kit of the Gundam Calibarn from the anime/manga series Mobile Suit Gundam: The Witch from Mercury.',
    price: '₱1499',
    details: 'Gunpla model kit of the Gundam Calibarn with detailed parts and articulation.'
  },
  {
    id: 2,
    image: '/pp/aerial/aerial_box.jpeg',
    images: [
      '/pp/aerial/aerial_1.jpeg',
      '/pp/aerial/aerial_2.jpeg',
      '/pp/aerial/aerial_3.jpeg',
      '/pp/aerial/aerial_4.jpeg',
      '/pp/aerial/aerial_5.jpeg',
      '/pp/aerial/aerial_6.jpeg',
      '/pp/aerial/aerial_7.jpeg',
      '/pp/aerial/aerial_8.jpeg',
      '/pp/aerial/aerial_9.jpeg',
      '/pp/aerial/aerial_10.jpeg'
    ],
    name: 'HG Gundam Aerial',
    desc: 'a 1/144 scale model kit of the Gundam Aerial from the anime/manga series Mobile Suit Gundam: The Witch from Mercury.',
    price: '₱1299',
    details: 'Gunpla model kit of the Gundam Aerial with advanced articulation and weaponry.'
  },

  {
    id: 3,
    image: '/pp/aerial_rebuild/aerial_rebuild_box.jpeg',
    images: [
      '/pp/aerial_rebuild/aerial_rebuild_1.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_2.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_3.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_4.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_5.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_6.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_7.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_8.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_9.jpeg',
      '/pp/aerial_rebuild/aerial_rebuild_10.jpeg'
    ],
    name: 'HG Gundam Aerial Rebuild',
    desc: 'a 1/144 scale model kit of the Gundam Aerial Rebuild from the anime/manga series Mobile Suit Gundam: The Witch from Mercury.',
    price: '₱1499',
    details: 'Gunpla model kit of the Gundam Aerial Rebuild with enhanced features and display options.'
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
  res.render('about', {
    title: "About Nemy's Gunpla & Collectibles",
    name: "Nemy's Gunpla & Collectibles",
    description: "Your one-stop shop for Gunpla model kits and collectibles.",
    user: req.session.user
  });
});


// ✉️ Contact page
router.get('/contact', (req, res) => {
  const user = req.session.user || null;
  res.render('contact', { title: "Contact Us", user });
});

module.exports = router;
