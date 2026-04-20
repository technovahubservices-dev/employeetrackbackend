const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Configure multer storage with absolute path
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Upload destination:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter for video files only
const fileFilter = (req, file, cb) => {
  console.log('Received file:', file.originalname, 'Mimetype:', file.mimetype);
  
  // Accept video files
  if (file.mimetype.startsWith('video/')) {
    console.log('File accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('File rejected - not a video:', file.originalname);
    cb(new Error('Only video files are allowed'), false);
  }
};

// Configure multer with debugging
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  }
});

// Middleware to add debugging
const uploadWithDebug = (fieldName) => {
  return (req, res, next) => {
    console.log('=== UPLOAD DEBUG START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Field name:', fieldName);
    
    // Use the upload middleware
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        console.log('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: 'Upload failed',
          error: err.message
        });
      }
      
      console.log('File uploaded successfully:');
      console.log('req.file:', req.file);
      console.log('req.body:', req.body);
      console.log('=== UPLOAD DEBUG END ===');
      
      next();
    });
  };
};

// Import controllers
const { login, supervisorlogin, register } = require('../controller/logincontroller');
const uploadController = require('../controller/uploadController');
const fixedUploadController = require('../controller/fixedUploadController');
const driveVerificationController = require('../controller/driveVerificationController');
const supervisorcontroller = require('../controller/supervisorcontroller');
const { saveToggle, updateToggle, getCameraSettings } = require('../controller/cameracontroller');
const { saveLocation, getLocations, getLatestLocation, getLocationsByEmployeeId, sendLocationToSupervisor } = require('../controller/locationController');
const videocontroller = require('../controller/videocontroller');



// JSON body parser
router.use(bodyParser.json());

// Login route
router.post('/login', login);
router.post('/supervisorlogin', supervisorlogin);


router.post('/register',register);

router.post('/camera',saveToggle);

router.post('/updatetogle',updateToggle);

router.get('/camera-settings', getCameraSettings);
router.get('/videos', uploadController.getAllVideos);

router.get('/test', (req, res) => {
  res.send("Route working ✅");
});


router.post('/getuser', login);
router.get('/getusers', login);
// Local storage video upload route (FIXED with absolute paths and debugging)
router.post('/upload-video', uploadWithDebug('video'), uploadController.uploadVideo);


// Fixed Google Drive upload routes (uploads to gopisahana2004@gmail.com)
const fixedDriveUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

router.post('/upload-to-fixed-drive', fixedDriveUpload.single('video'), fixedUploadController.uploadVideoToFixedDrive);
router.get('/fixed-drive-files', fixedUploadController.listFixedDriveFiles);
router.delete('/fixed-drive-file/:fileId', fixedUploadController.deleteFixedDriveFile);
router.get('/fixed-drive-status', fixedUploadController.getFixedDriveStatus);

// Drive verification routes
router.post('/verify-video', driveVerificationController.verifyVideoInDrive);
router.get('/list-videos', driveVerificationController.listAllVideos);
router.get('/check-video-accessibility/:fileId', driveVerificationController.checkVideoAccessibility);
router.post('/batch-verify-videos', driveVerificationController.batchVerifyVideos);

// Supervisor messaging routes
router.post('/supervisor', upload.single('image'), supervisorcontroller.savedata);
router.post('/message', supervisorcontroller.savedata);
router.get('/getmessage', supervisorcontroller.getMessages);
router.get('/getmessage/:email', supervisorcontroller.getMessagesByEmail);

// Location tracking routes
router.post('/location', saveLocation);
router.get('/location', getLocations);
router.get('/location/:employeeId/latest', getLatestLocation);
router.get('/location/:employeeId/all', getLocationsByEmployeeId);
router.post('/location-to-supervisor', sendLocationToSupervisor);

// Video routes
router.post('/video/save', videocontroller.saveVideoInfo);
router.get('/videos/:email', videocontroller.getVideosByEmail);
router.get('/videos/employee/:employeeId', videocontroller.getVideosByEmployeeId);
router.get('/videos/all', videocontroller.getAllVideos);
router.get('/video/:id', videocontroller.getVideoById);
router.delete('/video/:id', videocontroller.deleteVideo);

module.exports = router;