const path = require('path');
const fs = require('fs');
const Video = require('../model/Video');
const { google } = require('googleapis');

// Google Drive authentication
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'service-account-key.json'),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Upload to Google Drive
async function uploadToGoogleDrive(fileBuffer, fileName, folderId, description) {
  try {
    console.log('=== Google Drive Upload Starting ===');
    console.log('File:', fileName);
    console.log('Folder ID:', folderId);
    console.log('Description:', description);
    
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
        description: description,
      },
      media: {
        mimeType: 'video/webm',
        body: require('stream').Readable.from(fileBuffer),
      },
      fields: 'id,name,webViewLink,webContentLink,size',
    });

    console.log('✅ Google Drive Upload Successful');
    console.log('File ID:', response.data.id);
    console.log('File Name:', response.data.name);
    console.log('View Link:', response.data.webViewLink);
    console.log('File Size:', response.data.size);
    
    return {
      driveFileId: response.data.id,
      driveFileName: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      fileSize: response.data.size,
      uploadedToDrive: true,
    };
  } catch (error) {
    console.error('❌ Google Drive Upload Error:', error);
    console.error('Error details:', error.message);
    return null;
  }
}

// Get all videos
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
        location: video.location,
        uploadedToDrive: video.uploadedToDrive || false,
        driveFileId: video.driveFileId || null,
        targetAccount: video.targetAccount || null,
        folderName: video.folderName || null,
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

// Upload video with Google Drive integration
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

    const { 
      employeeId, 
      email, 
      employeeName, 
      folderName,  // Your folder ID: 1aLJ9x3mDOGLQS8PeClFWm239ODggcE3X
      saveToDrive,
      targetDriveEmail,
      useExactFolderId,
      locationName,
      lat,
      lng
    } = req.body;
    
    // File information
    const file = req.file;
    const filePath = file.path;
    const fileName = file.filename;
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${apiBase}/uploads/${fileName}`;

    console.log(`Video uploaded by ${employeeId}: ${fileName}`);
    console.log(`File path: ${filePath}`);
    console.log(`File size: ${file.size} bytes`);
    console.log(`Save to Drive: ${saveToDrive}`);
    console.log(`Folder Name: ${folderName}`);
    console.log(`Target Email: ${targetDriveEmail}`);
    console.log(`Use Exact Folder ID: ${useExactFolderId}`);
    console.log(`Location Name: ${locationName}`);
    
    let driveUploadResult = null;
    let finalVideoUrl = fileUrl;
    let finalVideoPath = filePath;
    
    // Upload to Google Drive if requested
    if (saveToDrive === 'true' && folderName) {
      console.log('=== Uploading to Google Drive ===');
      console.log('Target Folder ID:', folderName);
      
      try {
        // Read file buffer
        const fileBuffer = fs.readFileSync(filePath);
        
        // Create description
        const description = locationName 
          ? `Location: ${locationName}\nCoordinates: ${lat}, ${lng}\nUploaded by: ${email}\nTime: ${new Date().toISOString()}\nTarget Account: ${targetDriveEmail}`
          : `Uploaded by: ${email}\nTime: ${new Date().toISOString()}\nTarget Account: ${targetDriveEmail}`;
        
        // Upload to Drive
        driveUploadResult = await uploadToGoogleDrive(
          fileBuffer, 
          fileName, 
          folderName, // Use folderName as folder ID
          description
        );
        
        if (driveUploadResult) {
          console.log('✅ Google Drive Upload Successful!');
          console.log('Drive File ID:', driveUploadResult.driveFileId);
          console.log('Drive View Link:', driveUploadResult.webViewLink);
          
          finalVideoUrl = driveUploadResult.webViewLink;
          finalVideoPath = driveUploadResult.webViewLink;
          
          // Optionally delete local file to save space
          try {
            fs.unlinkSync(filePath);
            console.log('✅ Local file deleted after Drive upload');
          } catch (unlinkError) {
            console.log('⚠️  Could not delete local file:', unlinkError.message);
          }
        } else {
          console.log('❌ Google Drive Upload Failed - Using local storage');
        }
      } catch (driveError) {
        console.error('❌ Drive Upload Exception:', driveError);
        console.log('Falling back to local storage');
      }
    } else {
      console.log('📁 Saving to local storage only (Drive upload not requested)');
    }
    
    // Save to database
    const savedVideo = await Video.create({
      employeeId: employeeId || 'unknown',
      email: email || `${employeeId}@example.com`,
      employeeName: employeeName || employeeId,
      videoUrl: finalVideoUrl,
      videoPath: finalVideoPath,
      fileName: fileName,
      fileSize: file.size,
      duration: 0,
      videoBase64: null,
      location: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        locationName: locationName || null
      },
      uploadedToDrive: driveUploadResult ? true : false,
      driveFileId: driveUploadResult?.driveFileId || null,
      driveFileName: driveUploadResult?.driveFileName || null,
      webViewLink: driveUploadResult?.webViewLink || null,
      webContentLink: driveUploadResult?.webContentLink || null,
      targetAccount: targetDriveEmail || null,
      folderName: folderName || null,
      timestamp: new Date(),
    });
    
    console.log('✅ Video saved to database:', savedVideo._id);
    console.log('=== UPLOAD CONTROLLER DEBUG END ===');

    // Response
    res.status(200).json({
      success: true,
      message: driveUploadResult 
        ? 'Video uploaded successfully to Google Drive'
        : 'Video uploaded successfully to local storage',
      data: {
        employeeId: employeeId,
        fileName: fileName,
        fileSize: file.size,
        uploadedToDrive: driveUploadResult ? true : false,
        driveFileId: driveUploadResult?.driveFileId || null,
        driveFileName: driveUploadResult?.driveFileName || null,
        webViewLink: driveUploadResult?.webViewLink || null,
        shareableLink: driveUploadResult?.webViewLink || null,
        targetAccount: targetDriveEmail || null,
        folderName: folderName || null,
        videoUrl: finalVideoUrl,
        videoPath: finalVideoPath,
        localPath: driveUploadResult ? null : filePath,
        dbId: savedVideo._id,
        uploadTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error uploading video', 
      error: error.message 
    });
  }
};

// Upload to fixed Drive account (your specific endpoint)
exports.uploadToFixedDrive = async (req, res) => {
  try {
    console.log('=== UPLOAD TO FIXED DRIVE DEBUG START ===');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No video file uploaded' 
      });
    }

    const { 
      employeeId, 
      email, 
      employeeName, 
      folderName,  // Your folder ID: 1aLJ9x3mDOGLQS8PeClFWm239ODggcE3X
      folderUrl,
      saveToDrive,
      targetDriveEmail,
      useExactFolderId,
      locationName,
      lat,
      lng
    } = req.body;
    
    // File information
    const file = req.file;
    const filePath = file.path;
    const fileName = file.filename;
    const apiBase = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${apiBase}/uploads/${fileName}`;

    console.log(`=== Fixed Drive Upload ===`);
    console.log(`Employee: ${employeeId} (${email})`);
    console.log(`File: ${fileName} (${file.size} bytes)`);
    console.log(`Target Drive: ${targetDriveEmail}`);
    console.log(`Folder ID: ${folderName}`);
    console.log(`Folder URL: ${folderUrl}`);
    console.log(`Location: ${locationName}`);
    
    let driveUploadResult = null;
    let finalVideoUrl = fileUrl;
    let finalVideoPath = filePath;
    
    // Always upload to Google Drive for this endpoint
    if (folderName) {
      console.log('=== Uploading to Fixed Google Drive Folder ===');
      
      try {
        // Read file buffer
        const fileBuffer = fs.readFileSync(filePath);
        
        // Create enhanced description
        const description = `📍 Location: ${locationName || 'Unknown'}\n📧 Uploaded by: ${email}\n🎯 Target Account: ${targetDriveEmail}\n📍 Coordinates: ${lat}, ${lng}\n⏰ Time: ${new Date().toISOString()}\n📁 Folder: ${folderUrl}`;
        
        // Upload to Drive
        driveUploadResult = await uploadToGoogleDrive(
          fileBuffer, 
          fileName, 
          folderName, // Your folder ID
          description
        );
        
        if (driveUploadResult) {
          console.log('🎉 SUCCESS: Video uploaded to fixed Drive folder!');
          console.log('📁 Drive File ID:', driveUploadResult.driveFileId);
          console.log('🔗 Drive View Link:', driveUploadResult.webViewLink);
          console.log('👤 Target Account:', targetDriveEmail);
          
          finalVideoUrl = driveUploadResult.webViewLink;
          finalVideoPath = driveUploadResult.webViewLink;
          
          // Delete local file after successful Drive upload
          try {
            fs.unlinkSync(filePath);
            console.log('✅ Local file deleted after Drive upload');
          } catch (unlinkError) {
            console.log('⚠️  Could not delete local file:', unlinkError.message);
          }
        } else {
          console.log('❌ FAILED: Google Drive upload failed');
        }
      } catch (driveError) {
        console.error('❌ Drive Upload Exception:', driveError);
      }
    }
    
    // Save to database
    const savedVideo = await Video.create({
      employeeId: employeeId || 'unknown',
      email: email || `${employeeId}@example.com`,
      employeeName: employeeName || employeeId,
      videoUrl: finalVideoUrl,
      videoPath: finalVideoPath,
      fileName: fileName,
      fileSize: file.size,
      duration: 0,
      videoBase64: null,
      location: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        locationName: locationName || null
      },
      uploadedToDrive: driveUploadResult ? true : false,
      driveFileId: driveUploadResult?.driveFileId || null,
      driveFileName: driveUploadResult?.driveFileName || null,
      webViewLink: driveUploadResult?.webViewLink || null,
      webContentLink: driveUploadResult?.webContentLink || null,
      targetAccount: targetDriveEmail || null,
      folderName: folderName || null,
      folderUrl: folderUrl || null,
      useExactFolderId: useExactFolderId || null,
      timestamp: new Date(),
    });
    
    console.log('✅ Video saved to database:', savedVideo._id);
    console.log('=== FIXED DRIVE UPLOAD DEBUG END ===');

    // Response
    res.status(200).json({
      success: true,
      message: driveUploadResult 
        ? 'Video uploaded successfully to fixed Drive account'
        : 'Video uploaded to local storage (Drive upload failed)',
      data: {
        employeeId: employeeId,
        fileName: fileName,
        fileSize: file.size,
        uploadedToDrive: driveUploadResult ? true : false,
        driveFileId: driveUploadResult?.driveFileId || null,
        driveFileName: driveUploadResult?.driveFileName || null,
        webViewLink: driveUploadResult?.webViewLink || null,
        shareableLink: driveUploadResult?.webViewLink || null,
        targetAccount: targetDriveEmail || null,
        folderName: folderName || null,
        folderUrl: folderUrl || null,
        videoUrl: finalVideoUrl,
        videoPath: finalVideoPath,
        localPath: driveUploadResult ? null : filePath,
        dbId: savedVideo._id,
        uploadTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Fixed Drive Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error uploading to fixed Drive', 
      error: error.message 
    });
  }
};

// Multiple videos upload
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

    const savedVideos = await Video.insertMany(recordsToInsert, { ordered: true });

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