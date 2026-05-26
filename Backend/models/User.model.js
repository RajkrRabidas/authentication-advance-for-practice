const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role:{
      type: String,
      default: 'user',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
