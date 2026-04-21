const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    employeeName: {
        type: String,
        required: true
    },
    videoUrl: {
        type: String,
        required: true
    },
    videoPath: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    videoBase64: {
        type: String,
        required: false
    },
    fileSize: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        default: 0
    },
    thumbnailUrl: {
        type: String,
        default: null
    },
    location: {
        lat: {
            type: Number,
            required: false
        },
        lng: {
            type: Number,
            required: false
        },
        locationName: {
            type: String,
            default: null
        }
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    uploadedBy: {
        type: String,
        default: 'user'
    },
    isPublic: {
        type: Boolean,
        default: false
    }
});

// Index for faster queries
videoSchema.index({ email: 1, timestamp: -1 });
videoSchema.index({ employeeId: 1, timestamp: -1 });

module.exports = mongoose.models.VideoData || mongoose.model('VideoData', videoSchema);