# Flutter OAuth Integration Guide

This guide shows how to implement Google OAuth directly in your Flutter app instead of using signing reports.

## 1. Add Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  google_sign_in: ^6.1.5
  http: ^1.1.0
  flutter_secure_storage: ^9.0.0
  provider: ^6.1.1
```

## 2. Flutter OAuth Service

Create `services/auth_service.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  static final _storage = FlutterSecureStorage();
  static final _googleSignIn = GoogleSignIn(
    clientId: '617802833181-ujf888ri3i1mpql1s46nlpigg9e2mjml.apps.googleusercontent.com',
    serverClientId: '617802833181-ujf888ri3i1mpql1s46nlpigg9e2mjml.apps.googleusercontent.com',
    scopes: ['email', 'profile', 'https://www.googleapis.com/auth/drive.file'],
  );

  // Sign in with Google
  static Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      await _googleSignIn.signOut(); // Clear any existing session
      
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (account == null) return null;

      final GoogleSignInAuthentication? auth = await account.authentication;
      
      // Exchange auth code for backend tokens
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/mobile/auth/token-exchange'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'code': auth.serverAuthCode,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Store tokens securely
        await _storage.write(key: 'access_token', value: data['user']['accessToken']);
        await _storage.write(key: 'refresh_token', value: data['user']['refreshToken']);
        await _storage.write(key: 'user_data', value: jsonEncode(data['user']));
        
        return data['user'];
      } else {
        throw Exception('Failed to exchange token: ${response.body}');
      }
    } catch (error) {
      print('Google Sign-In Error: $error');
      return null;
    }
  }

  // Sign out
  static Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      await _storage.deleteAll();
    } catch (error) {
      print('Sign Out Error: $error');
    }
  }

  // Get current user
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final userData = await _storage.read(key: 'user_data');
      if (userData != null) {
        return jsonDecode(userData);
      }
      return null;
    } catch (error) {
      print('Get User Error: $error');
      return null;
    }
  }

  // Refresh token
  static Future<bool> refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;

      final response = await http.post(
        Uri.parse('http://localhost:3000/api/mobile/auth/refresh-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        await _storage.write(key: 'access_token', value: data['accessToken']);
        if (data['refreshToken'] != null) {
          await _storage.write(key: 'refresh_token', value: data['refreshToken']);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      print('Refresh Token Error: $error');
      return false;
    }
  }

  // Get access token
  static Future<String?> getAccessToken() async {
    return await _storage.read(key: 'access_token');
  }
}
```

## 3. Auth Provider

Create `providers/auth_provider.dart`:

```dart
import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  // Sign in
  Future<void> signIn() async {
    _setLoading(true);
    _error = null;

    try {
      final user = await AuthService.signInWithGoogle();
      if (user != null) {
        _user = user;
        notifyListeners();
      } else {
        _error = 'Sign in cancelled';
      }
    } catch (error) {
      _error = error.toString();
    } finally {
      _setLoading(false);
    }
  }

  // Sign out
  Future<void> signOut() async {
    await AuthService.signOut();
    _user = null;
    _error = null;
    notifyListeners();
  }

  // Load current user
  Future<void> loadUser() async {
    final user = await AuthService.getCurrentUser();
    if (user != null) {
      _user = user;
      notifyListeners();
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
```

## 4. Upload Service

Create `services/upload_service.dart`:

```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'auth_service.dart';

class UploadService {
  // Upload video to Google Drive
  static Future<Map<String, dynamic>?> uploadVideo(
    File videoFile, {
    String folderName = 'LiveTrackingVideos',
    String? employeeId,
  }) async {
    try {
      final accessToken = await AuthService.getAccessToken();
      if (accessToken == null) {
        throw Exception('Not authenticated');
      }

      // Create multipart request
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('http://localhost:3000/api/oauth/upload-video'),
      );

      // Add headers
      request.headers['Authorization'] = 'Bearer $accessToken';

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
        return jsonDecode(response.body);
      } else {
        throw Exception('Upload failed: ${response.body}');
      }
    } catch (error) {
      print('Upload Error: $error');
      return null;
    }
  }

  // List files from Google Drive
  static Future<List<dynamic>> listFiles({int pageSize = 10}) async {
    try {
      final accessToken = await AuthService.getAccessToken();
      if (accessToken == null) {
        throw Exception('Not authenticated');
      }

      final response = await http.get(
        Uri.parse('http://localhost:3000/api/oauth/files?pageSize=$pageSize'),
        headers: {
          'Authorization': 'Bearer $accessToken',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['files'];
      } else {
        throw Exception('Failed to list files: ${response.body}');
      }
    } catch (error) {
      print('List Files Error: $error');
      return [];
    }
  }
}
```

## 5. Main App Setup

Update your `main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => AuthProvider()..loadUser(),
      child: MaterialApp(
        title: 'Live Tracking',
        theme: ThemeData(primarySwatch: Colors.blue),
        home: Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            if (authProvider.isAuthenticated) {
              return HomeScreen();
            } else {
              return AuthScreen();
            }
          },
        ),
      ),
    );
  }
}
```

## 6. Auth Screen

Create `screens/auth_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class AuthScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Live Tracking')),
      body: Center(
        child: Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            if (authProvider.isLoading) {
              return CircularProgressIndicator();
            }

            if (authProvider.error != null) {
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Error: ${authProvider.error}',
                    style: TextStyle(color: Colors.red),
                  ),
                  SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: authProvider.clearError,
                    child: Text('Retry'),
                  ),
                ],
              );
            }

            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.cloud_upload, size: 100, color: Colors.blue),
                SizedBox(height: 20),
                Text(
                  'Live Tracking',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 40),
                ElevatedButton.icon(
                  onPressed: authProvider.signIn,
                  icon: Icon(Icons.login),
                  label: Text('Sign in with Google'),
                  style: ElevatedButton.styleFrom(
                    padding: EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
```

## 7. Home Screen

Create `screens/home_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/upload_service.dart';

class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _files = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadFiles();
  }

  Future<void> _loadFiles() async {
    setState(() => _isLoading = true);
    try {
      final files = await UploadService.listFiles();
      setState(() => _files = files);
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading files: $error')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Live Tracking'),
        actions: [
          IconButton(
            onPressed: () async {
              await authProvider.signOut();
            },
            icon: Icon(Icons.logout),
          ),
        ],
      ),
      body: Column(
        children: [
          // User info
          Container(
            padding: EdgeInsets.all(16),
            color: Colors.blue.shade50,
            child: Row(
              children: [
                CircleAvatar(
                  backgroundImage: NetworkImage(authProvider.user!['avatar']),
                ),
                SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authProvider.user!['name'],
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(authProvider.user!['email']),
                  ],
                ),
              ],
            ),
          ),
          
          // Files list
          Expanded(
            child: _isLoading
                ? Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: _files.length,
                    itemBuilder: (context, index) {
                      final file = _files[index];
                      return ListTile(
                        leading: Icon(Icons.video_file),
                        title: Text(file['name']),
                        subtitle: Text('Size: ${file['size'] ?? 'Unknown'}'),
                        trailing: Icon(Icons.open_in_new),
                        onTap: () {
                          // Open file
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _uploadVideo,
        child: Icon(Icons.upload),
      ),
    );
  }

  Future<void> _uploadVideo() async {
    // Implement video upload logic
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Upload feature coming soon!')),
    );
  }
}
```

## 8. Usage

1. **Install dependencies**: `flutter pub get`
2. **Run the app**: `flutter run`
3. **Sign in with Google**
4. **Upload videos to your Google Drive**

## Benefits

✅ No more signing reports needed
✅ Direct OAuth integration in Flutter
✅ Secure token storage
✅ Automatic token refresh
✅ Upload files to user's Google Drive
✅ Clean separation of concerns
