const { google } = require('googleapis');
const multer = require('multer');

// OAuth2 configuration for supervisor
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/supervisor/oauth/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Store supervisor tokens and user info
let supervisorTokens = null;
let supervisorUserInfo = null;

// Generate supervisor authorization URL
exports.getSupervisorAuthUrl = (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent',
      state: 'supervisor' // Different state for supervisor
    });

    console.log('🔐 Supervisor auth URL generated');
    res.status(200).json({
      success: true,
      authUrl: authUrl,
      message: 'Visit this URL to authorize supervisor access to Google Drive'
    });
  } catch (error) {
    console.error('❌ Supervisor auth URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate supervisor authorization URL',
      error: error.message
    });
  }
};

// Handle supervisor OAuth callback
exports.handleSupervisorCallback = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get supervisor user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Store supervisor tokens and info
    supervisorTokens = tokens;
    supervisorUserInfo = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      role: 'supervisor'
    };

    console.log(`✅ Supervisor authenticated: ${userInfo.email}`);

    res.status(200).json({
      success: true,
      message: 'Supervisor authentication successful',
      user: supervisorUserInfo
    });
  } catch (error) {
    console.error('❌ Supervisor callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle supervisor authentication',
      error: error.message
    });
  }
};

// Check supervisor authentication status
exports.checkSupervisorStatus = (req, res) => {
  try {
    if (supervisorTokens && supervisorUserInfo) {
      res.status(200).json({
        success: true,
        authenticated: true,
        user: supervisorUserInfo
      });
    } else {
      res.status(200).json({
        success: true,
        authenticated: false,
        message: 'Supervisor not authenticated'
      });
    }
  } catch (error) {
    console.error('❌ Supervisor status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check supervisor status',
      error: error.message
    });
  }
};

// Upload video to supervisor's Google Drive
exports.uploadToSupervisorDrive = async (req, res) => {
  try {
    if (!supervisorTokens) {
      return res.status(401).json({
        success: false,
        message: 'Supervisor not authenticated with Google Drive',
        authUrl: '/api/supervisor/oauth/auth-url'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    // Create authenticated Drive client
    const driveClient = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );
    driveClient.setCredentials(supervisorTokens);

    const drive = google.drive({ version: 'v3', auth: driveClient });

    const { employeeId, uploadedBy } = req.body;
    const fileName = `supervisor-upload-${employeeId}-${Date.now()}.mp4`;

    // Upload to supervisor's Google Drive
    const fileMetadata = {
      name: fileName,
      parents: [], // Root folder
      properties: {
        employeeId: employeeId,
        uploadedBy: uploadedBy || 'supervisor',
        uploadTime: new Date().toISOString(),
        source: 'supervisor-app'
      }
    };

    const media = {
      mimeType: 'video/mp4',
      body: require('stream').Readable.from(req.file.buffer)
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, size, createdTime'
    });

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    console.log(`✅ Video uploaded to supervisor Drive: ${fileName}`);

    res.status(200).json({
      success: true,
      message: 'Video uploaded to supervisor Google Drive successfully',
      data: {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
        size: response.data.size,
        uploadedBy: supervisorUserInfo.email
      }
    });
  } catch (error) {
    console.error('❌ Supervisor Drive upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload to supervisor Google Drive',
      error: error.message
    });
  }
};

// Logout supervisor
exports.logoutSupervisor = (req, res) => {
  try {
    supervisorTokens = null;
    supervisorUserInfo = null;

    console.log('✅ Supervisor logged out successfully');
    res.status(200).json({
      success: true,
      message: 'Supervisor logged out successfully'
    });
  } catch (error) {
    console.error('❌ Supervisor logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout supervisor',
      error: error.message
    });
  }
};
