const path = require('path');
const fs = require('fs');

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    // File information
    const file = req.file;
    const filePath = file.path;
    const fileName = file.filename;

    console.log(`📹 Video uploaded by ${employeeId}: ${fileName}`);
    console.log(`📍 File path: ${filePath}`);

    res.status(200).json({
      message: 'Video uploaded successfully',
      data: {
        employeeId: employeeId,
        fileName: fileName,
        filePath: filePath,
        uploadTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ message: 'Error uploading video', error: error.message });
  }
};
