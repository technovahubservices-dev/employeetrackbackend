const FixedDriveService = require('../services/fixedDriveService');
const { google } = require('googleapis');

// Verify if video exists in Google Drive
exports.verifyVideoInDrive = async (req, res) => {
  try {
    const { fileName, fileId } = req.body;
    
    if (!fileName && !fileId) {
      return res.status(400).json({ 
        message: 'Either fileName or fileId is required' 
      });
    }

    console.log('🔍 Verifying video in Google Drive...');
    console.log(`📁 File Name: ${fileName || 'N/A'}`);
    console.log(`🆔 File ID: ${fileId || 'N/A'}`);

    // Initialize Fixed Drive Service
    const initialized = await FixedDriveService.initialize();
    
    if (!initialized) {
      return res.status(500).json({
        message: 'Drive service not available',
        verified: false
      });
    }

    let verificationResult = null;

    if (fileId) {
      // Verify by File ID
      verificationResult = await _verifyByFileId(fileId);
    } else if (fileName) {
      // Verify by File Name
      verificationResult = await _verifyByFileName(fileName);
    }

    res.status(200).json({
      message: 'Video verification completed',
      verified: verificationResult.exists,
      fileInfo: verificationResult.fileInfo,
      searchQuery: verificationResult.searchQuery
    });

  } catch (error) {
    console.error('❌ Error verifying video:', error);
    res.status(500).json({ 
      message: 'Verification failed', 
      error: error.message,
      verified: false
    });
  }
};

// Verify by File ID
async function _verifyByFileId(fileId) {
  try {
    const drive = FixedDriveService.drive;
    
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,size,webViewLink,createdTime,modifiedTime,trashed'
    });

    const fileInfo = response.data;
    
    return {
      exists: true,
      fileInfo: {
        id: fileInfo.id,
        name: fileInfo.name,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        webViewLink: fileInfo.webViewLink,
        createdTime: fileInfo.createdTime,
        modifiedTime: fileInfo.modifiedTime,
        isTrashed: fileInfo.trashed,
        isVideo: fileInfo.mimeType.startsWith('video/')
      },
      searchQuery: `fileId: ${fileId}`
    };

  } catch (error) {
    if (error.code === 404) {
      return {
        exists: false,
        fileInfo: null,
        searchQuery: `fileId: ${fileId}`,
        error: 'File not found'
      };
    }
    throw error;
  }
}

// Verify by File Name
async function _verifyByFileName(fileName) {
  try {
    const drive = FixedDriveService.drive;
    
    // Search for files with exact name
    const searchQuery = `name='${fileName}' and trashed=false`;
    
    const response = await drive.files.list({
      q: searchQuery,
      fields: 'files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime)'
    });

    const files = response.data.files;
    
    if (files.length === 0) {
      return {
        exists: false,
        fileInfo: null,
        searchQuery: searchQuery,
        error: 'No files found with this name'
      };
    }

    // Return first matching file (could be multiple)
    const fileInfo = files[0];
    
    return {
      exists: true,
      fileInfo: {
        id: fileInfo.id,
        name: fileInfo.name,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        webViewLink: fileInfo.webViewLink,
        createdTime: fileInfo.createdTime,
        modifiedTime: fileInfo.modifiedTime,
        isVideo: fileInfo.mimeType.startsWith('video/'),
        totalMatches: files.length
      },
      searchQuery: searchQuery
    };

  } catch (error) {
    throw error;
  }
}

// List all videos in Drive
exports.listAllVideos = async (req, res) => {
  try {
    const { folderName = 'LiveTrackingUploads', pageSize = 50 } = req.query;
    
    console.log('📋 Listing all videos in Drive...');
    console.log(`📂 Folder: ${folderName}`);

    // Initialize Fixed Drive Service
    const initialized = await FixedDriveService.initialize();
    
    if (!initialized) {
      return res.status(500).json({
        message: 'Drive service not available',
        videos: []
      });
    }

    const drive = FixedDriveService.drive;
    
    // Search for all video files
    const searchQuery = folderName === 'all' 
      ? "mimeType contains 'video/' and trashed=false"
      : `name contains '${folderName}' and mimeType contains 'video/' and trashed=false`;
    
    const response = await drive.files.list({
      q: searchQuery,
      pageSize: pageSize,
      fields: 'files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime)'
    });

    const videos = response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      webViewLink: file.webViewLink,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      isVideo: file.mimeType.startsWith('video/')
    }));

    res.status(200).json({
      message: 'Videos retrieved successfully',
      totalVideos: videos.length,
      searchQuery: searchQuery,
      videos: videos
    });

  } catch (error) {
    console.error('❌ Error listing videos:', error);
    res.status(500).json({ 
      message: 'Failed to list videos', 
      error: error.message,
      videos: []
    });
  }
};

// Check video accessibility
exports.checkVideoAccessibility = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ 
        message: 'File ID is required' 
      });
    }

    console.log('🔗 Checking video accessibility...');

    // Initialize Fixed Drive Service
    const initialized = await FixedDriveService.initialize();
    
    if (!initialized) {
      return res.status(500).json({
        message: 'Drive service not available',
        accessible: false
      });
    }

    const drive = FixedDriveService.drive;
    
    // Check file permissions
    const permissionsResponse = await drive.permissions.list({
      fileId: fileId,
      fields: 'permissions(id,type,role,emailAddress,domain,displayName)'
    });

    const permissions = permissionsResponse.data.permissions;
    
    // Check if file is publicly accessible
    const isPublic = permissions.some(p => p.type === 'anyone' && p.role === 'reader');
    
    // Get file info
    const fileResponse = await drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,size,webViewLink'
    });

    res.status(200).json({
      message: 'Video accessibility check completed',
      accessible: true,
      isPubliclyAccessible: isPublic,
      fileInfo: fileResponse.data,
      permissions: permissions,
      shareableLink: fileResponse.data.webViewLink
    });

  } catch (error) {
    console.error('❌ Error checking accessibility:', error);
    res.status(500).json({ 
      message: 'Failed to check accessibility', 
      error: error.message,
      accessible: false
    });
  }
};

// Batch verify multiple videos
exports.batchVerifyVideos = async (req, res) => {
  try {
    const { fileNames, fileIds } = req.body;
    
    if (!fileNames && !fileIds) {
      return res.status(400).json({ 
        message: 'Either fileNames or fileIds array is required' 
      });
    }

    console.log('🔍 Batch verifying videos...');

    // Initialize Fixed Drive Service
    const initialized = await FixedDriveService.initialize();
    
    if (!initialized) {
      return res.status(500).json({
        message: 'Drive service not available',
        results: []
      });
    }

    const results = [];
    const itemsToVerify = fileNames || fileIds;

    for (const item of itemsToVerify) {
      try {
        let result;
        
        if (fileIds) {
          result = await _verifyByFileId(item);
        } else {
          result = await _verifyByFileName(item);
        }
        
        results.push({
          query: item,
          ...result
        });
        
      } catch (error) {
        results.push({
          query: item,
          exists: false,
          error: error.message
        });
      }
    }

    res.status(200).json({
      message: 'Batch verification completed',
      totalChecked: results.length,
      found: results.filter(r => r.exists).length,
      results: results
    });

  } catch (error) {
    console.error('❌ Error in batch verification:', error);
    res.status(500).json({ 
      message: 'Batch verification failed', 
      error: error.message,
      results: []
    });
  }
};
