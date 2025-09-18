// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');




// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true only if using HTTPS
        maxAge: 1 * 60 * 1000 // 15 minutes (in milliseconds)
    }
}));

//Routes
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');
const passwordRoute = require('./routes/password'); // ✅ add this

app.use('/', indexRoute);
app.use('/users', usersRoute);
app.use('/password', passwordRoute); // ✅ mount password routes


// MongoDB Setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Expose client & dbName to routes
app.locals.client = client;
app.locals.dbName = process.env.DB_NAME || "ecommerceDB";

async function main() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        // Select database
        // const database = client.db("ecommerceDB");

        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("MongoDB connection failed", err);
    }
}


main();