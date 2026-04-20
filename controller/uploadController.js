const path = require('path');
const fs = require('fs');

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
    const uploadDir = path.join(__dirname, '../uploads');
    console.log('Upload directory:', uploadDir);
    console.log('Directory exists:', fs.existsSync(uploadDir));

    // Check if uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log('Uploads directory does not exist');
      return res.status(200).json({
        message: 'No videos found',
        data: []
      });
    }

    // Read all files in uploads folder
    fs.readdir(uploadDir, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return res.status(500).json({
          message: 'Error reading files',
          error: err.message
        });
      }

      console.log('Files found in uploads:', files);

      // Filter only video files
      const videos = files.filter(file =>
        file.endsWith('.mp4') ||
        file.endsWith('.mov') ||
        file.endsWith('.avi') ||
        file.endsWith('.wmv') ||
        file.endsWith('.flv') ||
        file.endsWith('.webm') ||
        file.endsWith('.mkv')
      );

      console.log('Video files filtered:', videos);

      // Create response with file URLs and additional info
      const videoList = videos.map(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          fileName: file,
          fileUrl: `http://localhost:${process.env.PORT || 5000}/uploads/${file}`,
          filePath: filePath,
          fileSize: stats.size,
          uploadDate: stats.birthtime.toISOString(),
          sizeFormatted: formatFileSize(stats.size)
        };
      });

      console.log('Video list with details:', videoList);
      console.log('=== GET ALL VIDEOS DEBUG END ===');

      res.status(200).json({
        message: `Found ${videoList.length} videos`,
        data: videoList
      });
    });

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      message: 'Error fetching videos',
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
        fileUrl: `http://localhost:${process.env.PORT || 5000}/uploads/${fileName}`
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
