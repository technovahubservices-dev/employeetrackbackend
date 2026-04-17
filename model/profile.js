const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  location: { type: String, required: true },
  image: { type: String } // path to uploaded image
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);
