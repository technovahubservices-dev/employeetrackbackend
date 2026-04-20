const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Import controllers
const { login, supervisorlogin ,register} = require('../controller/logincontroller');
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


router.get('/test', (req, res) => {
  res.send("Route working ✅");
});


router.post('/getuser', login);
router.get('/getusers', login);
// Local storage video upload route
const localUpload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/upload-video', localUpload.single('video'), uploadController.uploadVideo);


// Fixed Google Drive upload routes (uploads to gopisahana2004@gmail.com)
const fixedDriveUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
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
router.post('/supervisor', localUpload.single('image'), supervisorcontroller.savedata);
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
