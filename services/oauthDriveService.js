const { google } = require('googleapis');

class OAuthDriveService {
  constructor() {
    this.drive = null;
  }

  // Initialize Drive service with OAuth token
  initialize(accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    this.drive = google.drive({ version: 'v3', auth });
    return this.drive;
  }

  // Upload file to user's Google Drive
  async uploadFile(accessToken, filePath, fileName, mimeType = 'video/mp4') {
    try {
      const drive = this.initialize(accessToken);
      
      const fileMetadata = {
        name: fileName,
      };

      const media = {
        mimeType: mimeType,
        body: require('fs').createReadStream(filePath)
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,size'
      });

      console.log(`✅ File uploaded to Google Drive: ${response.data.name}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error uploading to Google Drive:', error);
      throw error;
    }
  }

  // Create folder in Google Drive
  async createFolder(accessToken, folderName) {
    try {
      const drive = this.initialize(accessToken);
      
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        fields: 'id,name,webViewLink'
      });

      console.log(`✅ Folder created: ${response.data.name}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating folder:', error);
      throw error;
    }
  }

  // Upload file to specific folder
  async uploadToFolder(accessToken, filePath, fileName, folderId, mimeType = 'video/mp4') {
    try {
      const drive = this.initialize(accessToken);
      
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: mimeType,
        body: require('fs').createReadStream(filePath)
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,size'
      });

      console.log(`✅ File uploaded to folder: ${response.data.name}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error uploading to folder:', error);
      throw error;
    }
  }

  // Get shareable link for file
  async getShareableLink(accessToken, fileId) {
    try {
      const drive = this.initialize(accessToken);
      
      // Make file publicly accessible
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Get file details with webViewLink
      const response = await drive.files.get({
        fileId: fileId,
        fields: 'webViewLink'
      });

      return response.data.webViewLink;
    } catch (error) {
      console.error('❌ Error getting shareable link:', error);
      throw error;
    }
  }

  // List files in user's Drive
  async listFiles(accessToken, pageSize = 10) {
    try {
      const drive = this.initialize(accessToken);
      
      const response = await drive.files.list({
        pageSize: pageSize,
        fields: 'files(id,name,mimeType,size,webViewLink)'
      });

      return response.data.files;
    } catch (error) {
      console.error('❌ Error listing files:', error);
      throw error;
    }
  }
}

module.exports = new OAuthDriveService();
