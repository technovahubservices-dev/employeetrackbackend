const Video = require('../model/Video');
const fs = require('fs');
const path = require('path');
const googleDriveService = require('../services/googleDriveService');

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

// Upload video to Google Drive
exports.uploadVideoToDrive = async (req, res) => {
    try {
        const { 
            employeeId, 
            email, 
            employeeName, 
            lat,
            lng,
            locationName 
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ 
                message: 'No video file provided' 
            });
        }

        console.log(`📤 Processing video upload for employee: ${employeeId || 'UNKNOWN'}`);

        // Generate unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${employeeId || 'UNKNOWN'}_${timestamp}_${req.file.originalname}`;

        // Upload to Google Drive
        const driveResult = await googleDriveService.uploadVideo(
            req.file.path, 
            fileName,
            {
                description: `Employee: ${employeeName || email}, Location: ${locationName || 'Unknown'}`
            }
        );

        if (!driveResult.success) {
            // Clean up local file if drive upload failed
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(500).json({ 
                message: 'Failed to upload to Google Drive',
                error: driveResult.error 
            });
        }

        // Save video information to database
        const video = new Video({
            employeeId: employeeId || 'UNKNOWN',
            email: email || 'unknown@example.com',
            employeeName: employeeName || email?.split('@')[0] || 'Unknown',
            videoUrl: driveResult.webViewLink,
            videoPath: req.file.path,
            fileName: driveResult.fileName,
            fileSize: req.file.size,
            driveFileId: driveResult.fileId,
            location: {
                lat: lat || null,
                lng: lng || null,
                locationName: locationName || null
            }
        });

        await video.save();

        // Clean up local file after successful upload
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log(`🗑️ Cleaned up local file: ${req.file.path}`);
        }

        res.status(201).json({
            message: 'Video uploaded successfully to Google Drive',
            data: {
                video: video,
                driveInfo: {
                    fileId: driveResult.fileId,
                    webViewLink: driveResult.webViewLink,
                    size: driveResult.size
                }
            }
        });
    } catch (error) {
        console.error('❌ Error in uploadVideoToDrive:', error);
        
        // Clean up local file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            message: 'Error uploading video',
            error: error.message 
        });
    }
};

// Upload video from base64 to Google Drive
exports.uploadBase64VideoToDrive = async (req, res) => {
    try {
        const { 
            employeeId, 
            email, 
            employeeName, 
            videoBase64,
            fileName,
            fileSize,
            lat,
            lng,
            locationName 
        } = req.body;

        if (!videoBase64 || !fileName) {
            return res.status(400).json({ 
                message: 'videoBase64 and fileName are required' 
            });
        }

        console.log(`📤 Processing base64 video upload for employee: ${employeeId || 'UNKNOWN'}`);

        // Generate unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const uniqueFileName = `${employeeId || 'UNKNOWN'}_${timestamp}_${fileName}`;

        // Convert base64 to buffer
        const videoBuffer = Buffer.from(videoBase64, 'base64');

        // Upload to Google Drive from buffer
        const driveResult = await googleDriveService.uploadVideoFromBuffer(
            videoBuffer, 
            uniqueFileName,
            {
                description: `Employee: ${employeeName || email}, Location: ${locationName || 'Unknown'}`
            }
        );

        if (!driveResult.success) {
            return res.status(500).json({ 
                message: 'Failed to upload to Google Drive',
                error: driveResult.error 
            });
        }

        // Save video information to database
        const video = new Video({
            employeeId: employeeId || 'UNKNOWN',
            email: email || 'unknown@example.com',
            employeeName: employeeName || email?.split('@')[0] || 'Unknown',
            videoUrl: driveResult.webViewLink,
            fileName: driveResult.fileName,
            fileSize: fileSize || videoBuffer.length,
            driveFileId: driveResult.fileId,
            videoBase64: videoBase64,
            location: {
                lat: lat || null,
                lng: lng || null,
                locationName: locationName || null
            }
        });

        await video.save();

        res.status(201).json({
            message: 'Base64 video uploaded successfully to Google Drive',
            data: {
                video: video,
                driveInfo: {
                    fileId: driveResult.fileId,
                    webViewLink: driveResult.webViewLink,
                    size: driveResult.size
                }
            }
        });
    } catch (error) {
        console.error('❌ Error in uploadBase64VideoToDrive:', error);
        res.status(500).json({ 
            message: 'Error uploading base64 video',
            error: error.message 
        });
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
