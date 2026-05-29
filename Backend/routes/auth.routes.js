const express = require('express');
const {registerUser, verifyUser} = require("../controllers/user.controllers")

const router = express.Router();

router.post("/register", registerUser)
router.post("/verify/:token", verifyUser)

module.exports = router;
