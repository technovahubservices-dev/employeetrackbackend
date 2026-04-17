const fs = require('fs');
const path = require('path');
const OAuthDriveService = require('../services/oauthDriveService');
const User = require('../model/userModel');

// Upload video to user's Google Drive using OAuth
exports.uploadVideoToDrive = async (req, res) => {
  try {
    console.log('📹 Received OAuth video upload request');
    
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No video file provided',
        hasFile: !!req.file
      });
    }

    const { employeeId, folderName = 'LiveTrackingVideos' } = req.body;
    const videoFile = req.file;
    
    // Get user from session (assuming OAuth authentication)
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ message: 'User not authenticated or missing access token' });
    }

    console.log(`📋 Employee ID: ${employeeId}`);
    console.log(`📂 Target Folder: ${folderName}`);
    console.log(`📹 Video File: ${videoFile.originalname}`);

    // Save to local storage first
    const uploadPath = path.join(__dirname, '..', 'uploads', videoFile.originalname);
    
    // Ensure uploads directory exists
    const uploadsDir = path.dirname(uploadPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save video file
    if (videoFile.buffer) {
      fs.writeFileSync(uploadPath, videoFile.buffer);
    } else if (videoFile.path) {
      fs.copyFileSync(videoFile.path, uploadPath);
    }

    console.log('✅ Video saved locally:', uploadPath);

    try {
      const driveService = OAuthDriveService;
      
      // Create folder if it doesn't exist
      let folderId = null;
      try {
        const folder = await driveService.createFolder(req.user.accessToken, folderName);
        folderId = folder.id;
        console.log(`📂 Folder created: ${folder.name}`);
      } catch (folderError) {
        console.log('⚠️ Folder might already exist, trying to upload directly');
      }

      // Upload to Google Drive
      let driveFile;
      if (folderId) {
        driveFile = await driveService.uploadToFolder(
          req.user.accessToken, 
          uploadPath, 
          videoFile.originalname, 
          folderId
        );
      } else {
        driveFile = await driveService.uploadFile(
          req.user.accessToken, 
          uploadPath, 
          videoFile.originalname
        );
      }

      // Get shareable link
      const shareableLink = await driveService.getShareableLink(req.user.accessToken, driveFile.id);

      // Clean up local file
      fs.unlinkSync(uploadPath);
      console.log('🗑️ Local file cleaned up after successful Drive upload');

      // Return success response
      res.status(200).json({
        message: 'Video uploaded successfully to Google Drive',
        filename: videoFile.originalname,
        fileSize: videoFile.size,
        driveFileId: driveFile.id,
        driveFileName: driveFile.name,
        shareableLink: shareableLink,
        webViewLink: driveFile.webViewLink,
        uploadedBy: req.user.email,
        employeeId: employeeId
      });

    } catch (driveError) {
      console.error('❌ Google Drive upload failed:', driveError);
      
      // Return local file info as fallback
      res.status(200).json({
        message: 'Video saved locally (Drive upload failed)',
        filePath: uploadPath,
        filename: videoFile.originalname,
        fileSize: videoFile.size,
        driveError: driveError.message
      });
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      message: 'Upload failed', 
      error: error.message 
    });
  }
};

// List user's Google Drive files
exports.listDriveFiles = async (req, res) => {
  try {
    if (!req.user || !req.user.accessToken) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { pageSize = 10 } = req.query;
    const files = await OAuthDriveService.listFiles(req.user.accessToken, pageSize);

    res.json({
      message: 'Files retrieved successfully',
      files: files,
      count: files.length
    });

  } catch (error) {
    console.error('❌ Error listing files:', error);
    res.status(500).json({ 
      message: 'Failed to list files', 
      error: error.message 
    });
  }
};
