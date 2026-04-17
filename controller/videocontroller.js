const Video = require('../model/Video');
const fs = require('fs');
const path = require('path');

// Convert video file to base64
const convertVideoToBase64 = (videoPath) => {
    try {
        if (!fs.existsSync(videoPath)) {
            return null;
        }
        
        const videoBuffer = fs.readFileSync(videoPath);
        const base64Video = videoBuffer.toString('base64');
        return base64Video;
    } catch (error) {
        console.error('Error converting video to base64:', error);
        return null;
    }
};

// Save video information to database
exports.saveVideoInfo = async (req, res) => {
    try {
        const { 
            employeeId, 
            email, 
            employeeName, 
            videoUrl, 
            videoPath, 
            fileName, 
            fileSize, 
            duration,
            lat,
            lng,
            locationName 
        } = req.body;

        if (!email || !videoUrl || !fileName) {
            return res.status(400).json({ 
                message: 'email, videoUrl, and fileName are required' 
            });
        }

        // Convert video to base64 if path provided
        let videoBase64 = null;
        if (videoPath && fs.existsSync(videoPath)) {
            videoBase64 = convertVideoToBase64(videoPath);
        }

        const video = new Video({
            employeeId: employeeId || 'UNKNOWN',
            email,
            employeeName: employeeName || email.split('@')[0],
            videoUrl,
            videoPath,
            fileName,
            fileSize: fileSize || 0,
            duration: duration || 0,
            videoBase64: videoBase64,
            location: {
                lat: lat || null,
                lng: lng || null,
                locationName: locationName || null
            }
        });

        await video.save();

        res.status(201).json({
            message: 'Video information saved successfully',
            data: video
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get videos by email (for supervisor dashboard)
exports.getVideosByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        
        if (!email) {
            return res.status(400).json({ 
                message: 'email is required' 
            });
        }

        const videos = await Video.find({ email })
            .sort({ timestamp: -1 })
            .limit(50); // Limit to last 50 videos

        res.status(200).json({
            message: 'Videos retrieved successfully',
            data: videos,
            total: videos.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get videos by employee ID
exports.getVideosByEmployeeId = async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        if (!employeeId) {
            return res.status(400).json({ 
                message: 'employeeId is required' 
            });
        }

        const videos = await Video.find({ employeeId })
            .sort({ timestamp: -1 })
            .limit(50);

        res.status(200).json({
            message: 'Videos retrieved successfully',
            data: videos,
            total: videos.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all videos (for admin)
exports.getAllVideos = async (req, res) => {
    try {
        const videos = await Video.find({})
            .sort({ timestamp: -1 })
            .limit(100);

        res.status(200).json({
            message: 'All videos retrieved successfully',
            data: videos,
            total: videos.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get video by ID (with base64 for supervisor)
exports.getVideoById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ 
                message: 'video id is required' 
            });
        }

        const video = await Video.findById(id);
        
        if (!video) {
            return res.status(404).json({ 
                message: 'Video not found' 
            });
        }

        res.status(200).json({
            message: 'Video retrieved successfully',
            data: video
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete video
exports.deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ 
                message: 'video id is required' 
            });
        }

        const video = await Video.findById(id);
        
        if (!video) {
            return res.status(404).json({ 
                message: 'Video not found' 
            });
        }

        // Delete physical file if exists
        if (video.videoPath && fs.existsSync(video.videoPath)) {
            fs.unlinkSync(video.videoPath);
        }

        await Video.findByIdAndDelete(id);

        res.status(200).json({
            message: 'Video deleted successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upload video (legacy - keep for compatibility)
exports.uploadVideo = async (req, res) => {
  try {
    const { employeeId } = req.body;

    const newVideo = new Video({
      employeeId,
      videoUrl: req.file.path
    });

    await newVideo.save();

    res.status(200).json({
      message: "Video uploaded successfully",
      video: newVideo
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find();
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
