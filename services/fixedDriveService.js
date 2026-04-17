const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class FixedDriveService {
  constructor() {
    this.drive = null;
    this.targetEmail = 'gopisahana2004@gmail.com';
  }

  // Initialize with service account for fixed target account
  async initialize() {
    try {
      console.log('🔐 Initializing Fixed Drive Service for:', this.targetEmail);
      
      // Check if service account key exists
      const KEY_FILE = path.join(__dirname, '..', 'service-account-key.json');
      if (!fs.existsSync(KEY_FILE)) {
        console.error('❌ Service account key file not found');
        console.log('📝 Please create service account with Drive API access');
        return false;
      }

      const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.auth = auth;
      this.drive = google.drive({ version: 'v3', auth });

      console.log('✅ Fixed Drive Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Fixed Drive Service:', error);
      return false;
    }
  }

  // Upload file to fixed Google Drive account (using regular Drive with shared folder)
  async uploadToFixedDrive(filePath, fileName, folderName = 'LiveTrackingUploads') {
    try {
      console.log(`📤 Uploading ${fileName} to fixed Drive account: ${this.targetEmail}`);

      // Find the shared folder
      const folderId = await this._findSharedFolder(folderName);
      
      if (!folderId) {
        throw new Error('Could not find shared folder. Please share folder with service account.');
      }

      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: 'video/mp4',
        body: fs.createReadStream(filePath)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,size'
      });

      console.log(`✅ File uploaded to shared folder: ${response.data.name}`);
      console.log(`🔗 File ID: ${response.data.id}`);
      console.log(`🔗 View link: ${response.data.webViewLink}`);

      return response.data;
    } catch (error) {
      console.error('❌ Error uploading to shared folder:', error);
      throw error;
    }
  }

  // Find shared folder by name
  async _findSharedFolder(folderName) {
    try {
      // Search for the shared folder
      const searchResponse = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name)'
      });

      if (searchResponse.data.files.length > 0) {
        console.log(`📂 Found shared folder: ${folderName}`);
        return searchResponse.data.files[0].id;
      }

      console.log(`⚠️ Shared folder "${folderName}" not found`);
      console.log('💡 Please create folder in gopisahana2004@gmail.com Drive and share with service account');
      return null;
    } catch (error) {
      console.error('❌ Error finding shared folder:', error);
      return null;
    }
  }

  // Get shareable link for file
  async getShareableLink(fileId) {
    try {
      // Make file publicly accessible
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // Get file details with webViewLink
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'webViewLink'
      });

      return response.data.webViewLink;
    } catch (error) {
      console.error('❌ Error getting shareable link:', error);
      throw error;
    }
  }

  // List files in fixed Drive
  async listFiles(folderName = 'LiveTrackingUploads', pageSize = 10) {
    try {
      const folderId = await this._getOrCreateFolder(folderName);
      
      if (!folderId) {
        return [];
      }

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        pageSize: pageSize,
        fields: 'files(id,name,mimeType,size,webViewLink,createdTime)'
      });

      return response.data.files;
    } catch (error) {
      console.error('❌ Error listing files:', error);
      return [];
    }
  }

  // Delete file from fixed Drive
  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({ fileId: fileId });
      console.log(`🗑️ File deleted: ${fileId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return false;
    }
  }
}

module.exports = new FixedDriveService();
