# Flutter Fixed Drive Upload Service

This service uploads all files to the fixed Google Drive account (gopisahana2004@gmail.com) regardless of who logs in.

## 1. Fixed Drive Service

Create `services/fixed_drive_service.dart`:

```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class FixedDriveService {
  static const String baseUrl = 'http://localhost:3000/api';

  // Upload video to fixed Drive account (gopisahana2004@gmail.com)
  static Future<Map<String, dynamic>?> uploadVideoToFixedDrive(
    File videoFile, {
    String folderName = 'LiveTrackingUploads',
    String? employeeId,
  }) async {
    try {
      print('📤 Uploading to fixed Drive account: gopisahana2004@gmail.com');

      // Create multipart request
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/upload-to-fixed-drive'),
      );

      // Add video file
      final videoBytes = await videoFile.readAsBytes();
      final multipartFile = http.MultipartFile.fromBytes(
        'video',
        videoBytes,
        filename: videoFile.path.split('/').last,
        contentType: MediaType('video', 'mp4'),
      );
      request.files.add(multipartFile);

      // Add form fields
      request.fields['folderName'] = folderName;
      if (employeeId != null) {
        request.fields['employeeId'] = employeeId;
      }

      // Send request
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Upload successful to fixed Drive');
        return data;
      } else {
        throw Exception('Upload failed: ${response.body}');
      }
    } catch (error) {
      print('❌ Fixed Drive Upload Error: $error');
      return null;
    }
  }

  // List files from fixed Drive account
  static Future<List<dynamic>> listFixedDriveFiles({
    String folderName = 'LiveTrackingUploads',
    int pageSize = 10,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/fixed-drive-files?folderName=$folderName&pageSize=$pageSize'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['files'];
      } else {
        throw Exception('Failed to list files: ${response.body}');
      }
    } catch (error) {
      print('❌ List Fixed Drive Files Error: $error');
      return [];
    }
  }

  // Delete file from fixed Drive account
  static Future<bool> deleteFixedDriveFile(String fileId) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/fixed-drive-file/$fileId'),
      );

      if (response.statusCode == 200) {
        print('✅ File deleted from fixed Drive');
        return true;
      } else {
        throw Exception('Failed to delete file: ${response.body}');
      }
    } catch (error) {
      print('❌ Delete Fixed Drive File Error: $error');
      return false;
    }
  }

  // Check fixed Drive service status
  static Future<Map<String, dynamic>?> getFixedDriveStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/fixed-drive-status'),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get status: ${response.body}');
      }
    } catch (error) {
      print('❌ Fixed Drive Status Error: $error');
      return null;
    }
  }
}
```

## 2. Upload Provider

Create `providers/upload_provider.dart`:

```dart
import 'package:flutter/foundation.dart';
import '../services/fixed_drive_service.dart';

class UploadProvider extends ChangeNotifier {
  bool _isUploading = false;
  String? _uploadProgress;
  List<dynamic> _files = [];
  String? _error;
  Map<String, dynamic>? _lastUploadResult;

  bool get isUploading => _isUploading;
  String? get uploadProgress => _uploadProgress;
  List<dynamic> get files => _files;
  String? get error => _error;
  Map<String, dynamic>? get lastUploadResult => _lastUploadResult;

  // Upload video to fixed Drive
  Future<void> uploadVideoToFixedDrive(
    File videoFile, {
    String folderName = 'LiveTrackingUploads',
    String? employeeId,
  }) async {
    _setLoading(true);
    _error = null;
    _uploadProgress = 'Preparing upload...';

    try {
      _uploadProgress = 'Uploading to gopisahana2004@gmail.com...';
      notifyListeners();

      final result = await FixedDriveService.uploadVideoToFixedDrive(
        videoFile,
        folderName: folderName,
        employeeId: employeeId,
      );

      if (result != null) {
        _lastUploadResult = result;
        _uploadProgress = 'Upload completed!';
        
        // Refresh files list
        await loadFixedDriveFiles();
        
        notifyListeners();
      } else {
        _error = 'Upload failed';
      }
    } catch (error) {
      _error = error.toString();
    } finally {
      _setLoading(false);
      _uploadProgress = null;
    }
  }

  // Load files from fixed Drive
  Future<void> loadFixedDriveFiles({
    String folderName = 'LiveTrackingUploads',
  }) async {
    try {
      _files = await FixedDriveService.listFixedDriveFiles(folderName: folderName);
      notifyListeners();
    } catch (error) {
      _error = error.toString();
      notifyListeners();
    }
  }

  // Delete file from fixed Drive
  Future<void> deleteFixedDriveFile(String fileId) async {
    try {
      final success = await FixedDriveService.deleteFixedDriveFile(fileId);
      
      if (success) {
        // Remove from local list
        _files.removeWhere((file) => file['id'] == fileId);
        notifyListeners();
      } else {
        _error = 'Failed to delete file';
      }
    } catch (error) {
      _error = error.toString();
      notifyListeners();
    }
  }

  // Check service status
  Future<void> checkFixedDriveStatus() async {
    try {
      final status = await FixedDriveService.getFixedDriveStatus();
      if (status != null) {
        print('Fixed Drive Status: ${status['targetAccount']}');
        print('Service Available: ${status['serviceAvailable']}');
      }
    } catch (error) {
      _error = error.toString();
    }
  }

  void _setLoading(bool loading) {
    _isUploading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
```

## 3. Upload Screen

Create `screens/fixed_drive_upload_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/upload_provider.dart';
import '../services/fixed_drive_service.dart';

class FixedDriveUploadScreen extends StatefulWidget {
  @override
  _FixedDriveUploadScreenState createState() => _FixedDriveUploadScreenState();
}

class _FixedDriveUploadScreenState extends State<FixedDriveUploadScreen> {
  final ImagePicker _picker = ImagePicker();
  final _folderNameController = TextEditingController();
  final _employeeIdController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _folderNameController.text = 'LiveTrackingUploads';
    
    // Load existing files
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<UploadProvider>(context, listen: false).loadFixedDriveFiles();
      Provider.of<UploadProvider>(context, listen: false).checkFixedDriveStatus();
    });
  }

  @override
  void dispose() {
    _folderNameController.dispose();
    _employeeIdController.dispose();
    super.dispose();
  }

  Future<void> _pickVideo() async {
    final XFile? video = await _picker.pickVideo(source: ImageSource.gallery);
    
    if (video != null) {
      final uploadProvider = Provider.of<UploadProvider>(context, listen: false);
      await uploadProvider.uploadVideoToFixedDrive(
        File(video.path),
        folderName: _folderNameController.text,
        employeeId: _employeeIdController.text.isEmpty ? null : _employeeIdController.text,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Fixed Drive Upload'),
        subtitle: Text('All uploads go to gopisahana2004@gmail.com'),
        backgroundColor: Colors.green,
      ),
      body: Consumer<UploadProvider>(
        builder: (context, uploadProvider, child) {
          return SingleChildScrollView(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Upload Section
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Upload to Fixed Drive',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 16),
                        
                        // Folder Name
                        TextField(
                          controller: _folderNameController,
                          decoration: InputDecoration(
                            labelText: 'Folder Name',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.folder),
                          ),
                        ),
                        SizedBox(height: 16),
                        
                        // Employee ID
                        TextField(
                          controller: _employeeIdController,
                          decoration: InputDecoration(
                            labelText: 'Employee ID (Optional)',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.person),
                          ),
                        ),
                        SizedBox(height: 16),
                        
                        // Upload Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: uploadProvider.isUploading ? null : _pickVideo,
                            icon: uploadProvider.isUploading
                                ? CircularProgressIndicator(color: Colors.white)
                                : Icon(Icons.upload),
                            label: Text(uploadProvider.isUploading
                                ? 'Uploading...'
                                : 'Select Video to Upload'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              padding: EdgeInsets.symmetric(vertical: 16),
                            ),
                          ),
                        ),
                        
                        // Progress
                        if (uploadProvider.uploadProgress != null)
                          Padding(
                            padding: EdgeInsets.only(top: 16),
                            child: LinearProgressIndicator(),
                          ),
                        
                        if (uploadProvider.uploadProgress != null)
                          Padding(
                            padding: EdgeInsets.only(top: 8),
                            child: Text(uploadProvider.uploadProgress!),
                          ),
                        
                        // Error
                        if (uploadProvider.error != null)
                          Padding(
                            padding: EdgeInsets.only(top: 16),
                            child: Text(
                              uploadProvider.error!,
                              style: TextStyle(color: Colors.red),
                            ),
                          ),
                        
                        // Success
                        if (uploadProvider.lastUploadResult != null)
                          Padding(
                            padding: EdgeInsets.only(top: 16),
                            child: Container(
                              padding: EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                border: Border.all(color: Colors.green.shade200),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '✅ Upload Successful!',
                                    style: TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  SizedBox(height: 8),
                                  Text('File: ${uploadProvider.lastUploadResult!['filename']}'),
                                  Text('Target: ${uploadProvider.lastUploadResult!['targetAccount']}'),
                                  if (uploadProvider.lastUploadResult!['shareableLink'] != null)
                                    Text('Link: ${uploadProvider.lastUploadResult!['shareableLink']}'),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                
                SizedBox(height: 20),
                
                // Files List
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Files in Fixed Drive',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            IconButton(
                              onPressed: () => uploadProvider.loadFixedDriveFiles(),
                              icon: Icon(Icons.refresh),
                            ),
                          ],
                        ),
                        SizedBox(height: 16),
                        
                        if (uploadProvider.files.isEmpty)
                          Text('No files found')
                        else
                          ListView.builder(
                            shrinkWrap: true,
                            physics: NeverScrollableScrollPhysics(),
                            itemCount: uploadProvider.files.length,
                            itemBuilder: (context, index) {
                              final file = uploadProvider.files[index];
                              return ListTile(
                                leading: Icon(Icons.video_file),
                                title: Text(file['name']),
                                subtitle: Text('Size: ${file['size'] ?? 'Unknown'}'),
                                trailing: IconButton(
                                  onPressed: () => uploadProvider.deleteFixedDriveFile(file['id']),
                                  icon: Icon(Icons.delete, color: Colors.red),
                                ),
                                onTap: () {
                                  if (file['webViewLink'] != null) {
                                    // Open link
                                  }
                                },
                              );
                            },
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
```

## 4. Integration with Login

Update your auth provider to include fixed Drive upload:

```dart
// In your auth_provider.dart, add this method
Future<void> navigateToFixedDriveUpload(BuildContext context) async {
  Navigator.push(
    context,
    MaterialPageRoute(builder: (context) => FixedDriveUploadScreen()),
  );
}
```

## 5. Add to Main App

Add the upload screen to your main app navigation:

```dart
// In your home screen or supervisor screen, add this:
ElevatedButton(
  onPressed: () {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => FixedDriveUploadScreen()),
    );
  },
  child: Text('Upload to Fixed Drive'),
  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
),
```

## Usage

### Upload Video
```dart
await FixedDriveService.uploadVideoToFixedDrive(
  videoFile,
  folderName: 'MyVideos',
  employeeId: 'EMP001',
);
```

### List Files
```dart
final files = await FixedDriveService.listFixedDriveFiles();
```

### Delete File
```dart
await FixedDriveService.deleteFixedDriveFile('fileId');
```

## Features

✅ **Fixed Target**: All uploads go to gopisahana2004@gmail.com
✅ **No OAuth Required**: Uses service account authentication
✅ **Folder Management**: Organize files in folders
✅ **File Management**: List and delete uploaded files
✅ **Progress Tracking**: Real-time upload progress
✅ **Error Handling**: Proper error messages
✅ **Shareable Links**: Get public links for uploaded files

## API Endpoints

- `POST /api/upload-to-fixed-drive` - Upload video to fixed Drive
- `GET /api/fixed-drive-files` - List files from fixed Drive
- `DELETE /api/fixed-drive-file/:fileId` - Delete file from fixed Drive
- `GET /api/fixed-drive-status` - Check service status

All uploads will be saved to the Google Drive account: **gopisahana2004@gmail.com**
