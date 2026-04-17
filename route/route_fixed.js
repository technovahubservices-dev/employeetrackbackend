const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Import controllers
const logincontroller = require('../controller/logincontroller');
const uploadController = require('../controller/uploadController');
const personalDriveController = require('../controller/personalDriveController');
const fixedUploadController = require('../controller/fixedUploadController');
const driveVerificationController = require('../controller/driveVerificationController');
const supervisorcontroller = require('../controller/supervisorcontroller');
const { saveToggle, updateToggle, getCameraSettings } = require('../controller/cameracontroller');

// JSON body parser
router.use(bodyParser.json());

// Login route
router.post('/login', logincontroller.login);
router.post('/supervisorlogin', logincontroller.supervisorlogin);

router.post('/camera',saveToggle);

router.post('/updatetogle',updateToggle);

router.get('/camera-settings', getCameraSettings);


router.post('/getuser',logincontroller.getAllUsers);
router.get('/getusers',logincontroller.getAllUsers);

router.post('/deleteuser/:id',logincontroller.deleteUser);
router.delete('/deleteuser/:id',logincontroller.deleteUser);
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

// Personal Google Drive OAuth routes
router.get('/oauth/auth-url', personalDriveController.getAuthUrl);
router.get('/oauth/callback', personalDriveController.handleCallback);
router.get('/oauth/status', personalDriveController.checkStatus);
router.post('/oauth/logout', personalDriveController.logout);

// Personal Google Drive upload route
const driveUpload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/upload-to-personal-drive', driveUpload.single('video'), personalDriveController.uploadVideo);

// List files from personal Google Drive
router.get('/list-drive-files', personalDriveController.listFiles);

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

module.exports = router;
