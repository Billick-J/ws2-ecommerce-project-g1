// server.js
const express = require("express");
const { MongoClient } = require("mongodb");
const session = require("express-session");
let MongoStore;
try {
  MongoStore = require("connect-mongo");
  if (MongoStore && MongoStore.default) MongoStore = MongoStore.default;
  console.log("connect-mongo loaded:", typeof MongoStore);
} catch (err) {
  console.error("connect-mongo require failed:", err);
}

const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const multer = require("multer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------
// DATABASE CLIENT
// -------------------------
const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
app.locals.client = client;
app.locals.dbName = process.env.DB_NAME || "ecommerceDB";

// -------------------------
// SESSION SETUP (MongoDB store)
// -------------------------
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: uri,
    dbName: app.locals.dbName,
    collectionName: "sessions",
    ttl: 60 * 60 // 1 hour
  }),
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000
  }
}));

// expose session to views + debug
app.use((req, res, next) => {
  console.log("Session ID:", req.sessionID);
  console.log("Session user:", req.session?.user);
  res.locals.user = req.session?.user || null;
  res.locals.req = req;
  next();
});

// trust proxy
app.set("trust proxy", 1);

// -------------------------
// SECURITY & PERFORMANCE
// -------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://challenges.cloudflare.com"],
        frameSrc: ["'self'", "https://challenges.cloudflare.com"],
        connectSrc: ["'self'", "https://challenges.cloudflare.com"],
      }
    }
  })
);
app.use(compression());

// -------------------------
// BODY PARSING & STATIC FILES
// -------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");


const ordersRoute = require("./routes/orders");
app.use("/orders", ordersRoute);
// -------------------------
// MULTER CONFIG
// -------------------------
const uploadStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "public", "uploads"));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage: uploadStorage });
app.locals.upload = upload;

// -------------------------
// ROUTES
// -------------------------

// Admin Orders Route
const adminOrdersRoute = require("./routes/adminOrders");
app.use("/admin/orders", adminOrdersRoute);

const indexRoute = require("./routes/index");
const usersRoute = require("./routes/users");
const adminRoute = require("./routes/admin");
const passwordRoute = require("./routes/password");

app.use("/", indexRoute);
app.use("/users", usersRoute);
app.use("/admin", adminRoute);
app.use("/password", passwordRoute);

// -------------------------
// HEALTH & TEST ROUTES
// -------------------------
app.get("/health", (req, res) => res.type("text").send("ok"));
app.get("/crash", (req, res) => { throw new Error("Intentional crash"); });
app.get("/boom", (req, res) => { throw new Error("Test 500"); });
app.get("/crash-async", async (req, res, next) => {
  try { throw new Error("Async crash"); }
  catch (err) { next(err); }
});
app.get("/sitemap.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "sitemap.xml"));
});

// -------------------------
// ERROR HANDLING
// -------------------------
app.use((req, res, next) => {
  if (!res.headersSent) {
    console.warn("404:", req.method, req.originalUrl, "ref:", req.get("referer") || "-");
  }
  next();
});

app.use((req, res) => {
  res.set("Cache-Control", "no-store");
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not Found", path: req.path });
  }
  res.status(404).render("404", { title: "Page Not Found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (req.path.startsWith("/api/")) {
    return res.status(500).json({ error: "Server Error" });
  }
  res.status(500).render("500", {
    title: "Server Error",
    req,
    user: req.session?.user || null
  });
});

// -------------------------
// DATABASE + START SERVER
// -------------------------
async function main() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
}
main();