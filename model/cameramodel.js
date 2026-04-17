const mongoose = require('mongoose');

const toggleSchema = new mongoose.Schema({
  status: {
    type: Number,
    enum: [0, 1], 
    required: true
  },
  captureOnly: {
    type: Boolean,
    default: true // true = capture but don't show, false = capture and show
  },
  displayImage: {
    type: Boolean,
    default: false // true = show image on screen, false = don't show
  }
}, { timestamps: true });

module.exports = mongoose.model('Toggle', toggleSchema);
