const fs = require('fs');
const path = require('path');
const FixedDriveService = require('../services/fixedDriveService');

// Initialize fixed drive service
const fixedDriveService = FixedDriveService;
fixedDriveService.initialize().then(success => {
  if (success) {
    console.log('🚀 Fixed Drive Service ready - All uploads will go to gopisahana2004@gmail.com');
  } else {
    console.log('⚠️ Fixed Drive Service not available - files will be saved locally only');
  }
});

// Upload video to fixed Google Drive account
exports.uploadVideoToFixedDrive = async (req, res) => {
  try {
    console.log('📹 Received fixed Drive upload request');
    console.log('👤 Uploading to fixed account: gopisahana2004@gmail.com');
    
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No video file provided',
        hasFile: !!req.file
      });
    }

    const { employeeId, folderName = 'LiveTrackingUploads' } = req.body;
    const videoFile = req.file;
    
    console.log(`📋 Employee ID: ${employeeId || 'N/A'}`);
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
      // Upload to fixed Google Drive account
      let driveFile = null;
      let shareableLink = null;

      if (fixedDriveService.drive) {
        console.log('📤 Uploading to fixed Google Drive account...');
        driveFile = await fixedDriveService.uploadToFixedDrive(
          uploadPath, 
          videoFile.originalname, 
          folderName
        );
        
        if (driveFile) {
          shareableLink = await fixedDriveService.getShareableLink(driveFile.id);
          console.log('🔗 Shareable link:', shareableLink);
        }
      } else {
        console.log('📂 Fixed Drive service not available, file saved locally only');
      }

      // Clean up local file if uploaded successfully
      if (driveFile && shareableLink) {
        try {
          fs.unlinkSync(uploadPath);
          console.log('🗑️ Local file cleaned up after successful Drive upload');
        } catch (cleanupError) {
          console.log('⚠️ Could not clean up local file:', cleanupError.message);
        }
      }

      // Return success response
      const responseData = {
        message: 'Video uploaded successfully to fixed Drive account',
        targetAccount: 'gopisahana2004@gmail.com',
        filename: videoFile.originalname,
        fileSize: videoFile.size,
        uploadedToDrive: !!driveFile,
        driveFileId: driveFile?.id || null,
        driveFileName: driveFile?.name || null,
        shareableLink: shareableLink || null,
        webViewLink: driveFile?.webViewLink || null,
        employeeId: employeeId || 'N/A',
        folderName: folderName,
        localPath: !driveFile ? uploadPath : null
      };

      res.status(200).json(responseData);

    } catch (driveError) {
      console.error('❌ Fixed Drive upload failed:', driveError);
      
      // Return local file info as fallback
      res.status(200).json({
        message: 'Video saved locally (Fixed Drive upload failed)',
        targetAccount: 'gopisahana2004@gmail.com',
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

// List files from fixed Drive account
exports.listFixedDriveFiles = async (req, res) => {
  try {
    const { folderName = 'LiveTrackingUploads', pageSize = 10 } = req.query;
    
    console.log('📋 Listing files from fixed Drive account: gopisahana2004@gmail.com');
    
    const files = await fixedDriveService.listFiles(folderName, pageSize);

    res.json({
      message: 'Files retrieved from fixed Drive account',
      targetAccount: 'gopisahana2004@gmail.com',
      folderName: folderName,
      files: files,
      count: files.length
    });

  } catch (error) {
    console.error('❌ Error listing fixed Drive files:', error);
    res.status(500).json({ 
      message: 'Failed to list files from fixed Drive', 
      error: error.message 
    });
  }
};

// Delete file from fixed Drive account
exports.deleteFixedDriveFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ message: 'File ID is required' });
    }

    console.log(`🗑️ Deleting file from fixed Drive: ${fileId}`);
    
    const success = await fixedDriveService.deleteFile(fileId);

    if (success) {
      res.json({
        message: 'File deleted successfully from fixed Drive',
        targetAccount: 'gopisahana2004@gmail.com',
        fileId: fileId
      });
    } else {
      res.status(500).json({
        message: 'Failed to delete file from fixed Drive',
        targetAccount: 'gopisahana2004@gmail.com',
        fileId: fileId
      });
    }

  } catch (error) {
    console.error('❌ Error deleting fixed Drive file:', error);
    res.status(500).json({ 
      message: 'Failed to delete file from fixed Drive', 
      error: error.message 
    });
  }
};

// Get fixed Drive service status
exports.getFixedDriveStatus = async (req, res) => {
  try {
    const isInitialized = !!fixedDriveService.drive;
    
    res.json({
      message: 'Fixed Drive service status',
      targetAccount: 'gopisahana2004@gmail.com',
      isInitialized: isInitialized,
      serviceAvailable: isInitialized
    });

  } catch (error) {
    console.error('❌ Error getting fixed Drive status:', error);
    res.status(500).json({ 
      message: 'Failed to get fixed Drive status', 
      error: error.message 
    });
  }
};
