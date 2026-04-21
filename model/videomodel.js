const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    default: null
  },
  originalName: {
    type: String,
    default: null
  },
  videoPath: {
    type: String,
    default: null
  },
  mimetype: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('VideoUpload', videoSchema);