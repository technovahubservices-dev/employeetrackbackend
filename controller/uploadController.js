const path = require('path');
const fs = require('fs');
const Video = require('../model/Video');

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

exports.getAllVideos = async (req, res) => {
  try {
    console.log('=== GET ALL VIDEOS DEBUG START ===');
    
    // Get videos from Video model (database)
    const videos = await Video.find({})
      .sort({ timestamp: -1 })
      .limit(100); // Limit to last 100 videos

    console.log('Videos found in database:', videos.length);

    if (videos.length === 0) {
      console.log('No videos found in database');
      return res.status(200).json({
        success: true,
        message: 'No videos found',
        data: []
      });
    }

    // Verify files exist and create response data
    const videoList = videos.map(video => {
      const fileExists = video.videoPath ? fs.existsSync(video.videoPath) : false;
      
      return {
        _id: video._id,
        employeeId: video.employeeId,
        email: video.email,
        employeeName: video.employeeName,
        fileName: video.fileName,
        videoUrl: video.videoUrl,
        videoPath: video.videoPath,
        fileSize: video.fileSize,
        duration: video.duration,
        timestamp: video.timestamp,
        fileExists: fileExists,
        location: video.location
      };
    });

    console.log('Video list created:', videoList.length, 'videos');
    
    res.status(200).json({
      success: true,
      message: 'Videos retrieved successfully',
      data: videoList,
      total: videoList.length
    });
    
  } catch (error) {
    console.error('Error getting all videos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error retrieving videos', 
      error: error.message 
    });
  }
};

exports.uploadVideo = async (req, res) => {
  try {
    console.log('=== UPLOAD CONTROLLER DEBUG START ===');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    
    if (!req.file) {
      console.log('No file received in request');
      return res.status(400).json({ 
        success: false,
        message: 'No video file uploaded' 
      });
    }

    const { employeeId } = req.body;
    
    if (!employeeId) {
      console.log('Employee ID missing from request body');
      return res.status(400).json({ 
        success: false,
        message: 'Employee ID is required' 
      });
    }

    // File information
    const file = req.file;
    const filePath = file.path;
    const fileName = file.filename;
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${apiBase}/uploads/${fileName}`;

    console.log(`Video uploaded by ${employeeId}: ${fileName}`);
    console.log(`File path: ${filePath}`);
    console.log(`File size: ${file.size} bytes`);
    console.log(`File mimetype: ${file.mimetype}`);
    
    // Verify file exists on disk
    if (!fs.existsSync(filePath)) {
      console.error('File was not saved to disk:', filePath);
      return res.status(500).json({
        success: false,
        message: 'File was not saved properly'
      });
    }

    // Append a new DB record for each upload (never replace existing uploads)
    const savedVideo = await Video.create({
      employeeId,
      email: `${employeeId}@example.com`, // Generate email from employeeId
      employeeName: employeeId,
      videoUrl: fileUrl,
      videoPath: filePath,
      fileName,
      fileSize: file.size,
      duration: 0, // Will be updated later if needed
      videoBase64: null, // Will be added later if needed
      location: {
        lat: null,
        lng: null,
        locationName: null
      }
    });
    
    console.log('Video saved to Video model:', savedVideo._id);
    
    console.log('File verified to exist on disk');
    console.log('=== UPLOAD CONTROLLER DEBUG END ===');

    res.status(200).json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        employeeId: employeeId,
        fileName: fileName,
        filePath: filePath,
        fileSize: file.size,
        mimetype: file.mimetype,
        uploadTime: new Date().toISOString(),
        fileUrl,
        dbId: savedVideo._id
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error uploading video', 
      error: error.message 
    });
  }
};

exports.uploadVideos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No video files uploaded'
      });
    }

    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const apiBase = `${req.protocol}://${req.get('host')}`;
    const recordsToInsert = req.files.map((file) => ({
      employeeId,
      videoUrl: `${apiBase}/uploads/${file.filename}`,
      fileName: file.filename,
      videoPath: file.path,
      fileSize: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname
    }));

    const savedVideos = await VideoUpload.insertMany(recordsToInsert, { ordered: true });

    res.status(200).json({
      success: true,
      message: `${savedVideos.length} videos uploaded successfully`,
      count: savedVideos.length,
      data: savedVideos.map((item) => ({
        id: item._id,
        employeeId: item.employeeId,
        fileName: item.fileName,
        filePath: item.videoPath,
        fileUrl: item.videoUrl,
        fileSize: item.fileSize,
        mimetype: item.mimetype,
        uploadTime: item.createdAt
      }))
    });
  } catch (error) {
    console.error('Multi-upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading videos',
      error: error.message
    });
  }
};
