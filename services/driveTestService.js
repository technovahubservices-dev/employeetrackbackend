const googleDriveService = require('./googleDriveService');

// Test function to verify Google Drive connectivity
async function testDriveConnection() {
    try {
        console.log('🔍 Testing Google Drive connection...');
        
        // Initialize the service
        const initialized = await googleDriveService.initialize();
        
        if (!initialized) {
            return {
                success: false,
                error: 'Failed to initialize Google Drive service'
            };
        }
        
        console.log('✅ Google Drive service initialized successfully');
        
        // Test folder access
        if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
            try {
                const response = await googleDriveService.drive.files.get({
                    fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
                    fields: 'id,name,size'
                });
                
                console.log(`✅ Folder accessible: ${response.data.name} (${response.data.id})`);
                
                return {
                    success: true,
                    message: 'Google Drive connection successful',
                    folder: {
                        id: response.data.id,
                        name: response.data.name,
                        size: response.data.size
                    }
                };
            } catch (folderError) {
                console.warn('⚠️ Target folder not accessible:', folderError.message);
                
                return {
                    success: true,
                    message: 'Google Drive connection successful, but target folder not accessible',
                    warning: 'Files will be uploaded to root folder',
                    error: folderError.message
                };
            }
        } else {
            console.warn('⚠️ No folder ID specified in environment variables');
            
            return {
                success: true,
                message: 'Google Drive connection successful',
                warning: 'No target folder specified, files will be uploaded to root folder'
            };
        }
        
    } catch (error) {
        console.error('❌ Google Drive connection test failed:', error);
        
        return {
            success: false,
            error: error.message,
            details: {
                message: error.message,
                code: error.code,
                status: error.status
            }
        };
    }
}

// List files in Drive (for testing)
async function listTestFiles() {
    try {
        const files = await googleDriveService.listFiles(5);
        
        return {
            success: true,
            message: `Found ${files.length} files`,
            files: files.map(file => ({
                id: file.id,
                name: file.name,
                size: file.size,
                createdTime: file.createdTime,
                webViewLink: file.webViewLink
            }))
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    testDriveConnection,
    listTestFiles
};
