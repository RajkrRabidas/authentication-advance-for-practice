const express = require('express');
const authRoute = require("../routes/auth.routes")

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoute)


module.exports = app;