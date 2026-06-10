const express = require('express');
const {registerUser, verifyUser, loginUser, verifyOtp} = require("../controllers/user.controllers")

const router = express.Router();

router.post("/register", registerUser)
router.post("/verify/:token", verifyUser)
router.post("/login", loginUser)
router.post("/verify-otp", verifyOtp)

module.exports = router;
