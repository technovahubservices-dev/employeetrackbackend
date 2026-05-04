const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.auth = null;
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    }

    async initialize() {
        try {
            console.log('🔐 Initializing Google Drive Service...');
            
            let keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
            console.log(`🔍 Looking for service account key at: ${keyPath}`);
            
            // Try multiple possible paths
            const possiblePaths = [
                keyPath,
                path.join(__dirname, '..', '..', 'service-account-key.json'),
                path.join(__dirname, '..', 'service-account-key.json'),
                './service-account-key.json',
                '../service-account-key.json'
            ];
            
            let foundPath = null;
            for (const testPath of possiblePaths) {
                if (testPath && fs.existsSync(testPath)) {
                    foundPath = testPath;
                    console.log(`✅ Found service account key at: ${foundPath}`);
                    break;
                } else if (testPath) {
                    console.log(`❌ Not found: ${testPath}`);
                }
            }
            
            if (!foundPath) {
                throw new Error(`Service account key file not found. Tried paths: ${possiblePaths.filter(p => p).join(', ')}`);
            }

            this.auth = new google.auth.GoogleAuth({
                keyFile: foundPath,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });

            this.drive = google.drive({ version: 'v3', auth: this.auth });
            
            console.log('✅ Google Drive Service initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Google Drive Service:', error);
            return false;
        }
    }

    async uploadVideo(filePath, fileName, metadata = {}) {
        try {
            if (!this.drive) {
                const initialized = await this.initialize();
                if (!initialized) {
                    throw new Error('Failed to initialize Google Drive service');
                }
            }

            console.log(`📤 Uploading video: ${fileName}`);
            console.log(`📂 Target folder ID: ${this.folderId}`);

            let targetFolderId = this.folderId;
            
            // Verify folder exists and is accessible
            if (this.folderId) {
                try {
                    await this.drive.files.get({
                        fileId: this.folderId,
                        fields: 'id,name'
                    });
                    console.log(`✅ Folder accessible: ${this.folderId}`);
                } catch (folderError) {
                    console.warn('⚠️ Target folder not accessible, uploading to root folder:', folderError.message);
                    targetFolderId = null; // Upload to root folder
                }
            }

            const fileMetadata = {
                name: fileName,
                parents: targetFolderId ? [targetFolderId] : undefined,
                ...metadata
            };

            // Determine MIME type based on file extension
            const mimeType = this._getMimeType(fileName);
            
            const media = {
                mimeType: mimeType,
                body: fs.createReadStream(filePath)
            };

            console.log('🔄 Starting upload to Google Drive...');
            
            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id,name,webViewLink,size,createdTime'
            });

            console.log(`✅ Video uploaded successfully: ${response.data.name}`);
            console.log(`🔗 File ID: ${response.data.id}`);
            console.log(`🔗 View link: ${response.data.webViewLink}`);

            return {
                success: true,
                fileId: response.data.id,
                fileName: response.data.name,
                webViewLink: response.data.webViewLink,
                size: response.data.size,
                createdTime: response.data.createdTime
            };
        } catch (error) {
            console.error('❌ Error uploading video to Google Drive:', error);
            console.error('❌ Full error details:', {
                message: error.message,
                code: error.code,
                status: error.status,
                details: error.details
            });
            return {
                success: false,
                error: error.message
            };
        }
    }

    async uploadVideoFromBuffer(buffer, fileName, metadata = {}) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            console.log(`📤 Uploading video from buffer: ${fileName}`);

            const fileMetadata = {
                name: fileName,
                parents: this.folderId ? [this.folderId] : undefined,
                ...metadata
            };

            const mimeType = this._getMimeType(fileName);
            
            const media = {
                mimeType: mimeType,
                body: require('stream').Readable.from(buffer)
            };

            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id,name,webViewLink,size,createdTime'
            });

            console.log(`✅ Video uploaded successfully from buffer: ${response.data.name}`);

            return {
                success: true,
                fileId: response.data.id,
                fileName: response.data.name,
                webViewLink: response.data.webViewLink,
                size: response.data.size,
                createdTime: response.data.createdTime
            };
        } catch (error) {
            console.error('❌ Error uploading video buffer to Google Drive:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getShareableLink(fileId) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

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

    async deleteFile(fileId) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            await this.drive.files.delete({ fileId: fileId });
            console.log(`🗑️ File deleted from Drive: ${fileId}`);
            return true;
        } catch (error) {
            console.error('❌ Error deleting file from Drive:', error);
            return false;
        }
    }

    async listFiles(pageSize = 10) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            let query = 'trashed=false';
            if (this.folderId) {
                query = `'${this.folderId}' in parents and trashed=false`;
            }

            const response = await this.drive.files.list({
                q: query,
                pageSize: pageSize,
                fields: 'files(id,name,mimeType,size,webViewLink,createdTime)',
                orderBy: 'createdTime desc'
            });

            return response.data.files;
        } catch (error) {
            console.error('❌ Error listing files:', error);
            return [];
        }
    }

    _getMimeType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.flv': 'video/x-flv',
            '.webm': 'video/webm',
            '.mkv': 'video/x-matroska'
        };
        return mimeTypes[ext] || 'video/mp4';
    }
}

module.exports = new GoogleDriveService();
