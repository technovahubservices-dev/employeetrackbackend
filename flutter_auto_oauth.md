# Flutter Auto OAuth - No Re-authentication

This guide shows how to implement OAuth login that stays authenticated without requiring re-login.

## 1. Persistent OAuth Service

Create `services/persistent_oauth_service.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';

class PersistentOAuthService {
  static const String baseUrl = 'http://localhost:3000/api';
  static final _storage = FlutterSecureStorage();

  // Check if user is already authenticated
  static Future<bool> isAuthenticated() async {
    try {
      final accessToken = await _storage.read(key: 'access_token');
      final refreshToken = await _storage.read(key: 'refresh_token');
      final userEmail = await _storage.read(key: 'user_email');
      
      return accessToken != null && refreshToken != null && userEmail != null;
    } catch (error) {
      return false;
    }
  }

  // Get current user
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final accessToken = await _storage.read(key: 'access_token');
      final userEmail = await _storage.read(key: 'user_email');
      final userName = await _storage.read(key: 'user_name');
      final userAvatar = await _storage.read(key: 'user_avatar');
      
      if (accessToken != null && userEmail != null) {
        return {
          'email': userEmail,
          'name': userName ?? userEmail.split('@')[0],
          'avatar': userAvatar,
          'accessToken': accessToken,
          'isAuthenticated': true
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Auto-login using stored tokens
  static Future<Map<String, dynamic>?> autoLogin() async {
    try {
      final isAuth = await isAuthenticated();
      if (!isAuth) {
        return null;
      }

      final currentUser = await getCurrentUser();
      if (currentUser != null) {
        // Validate token by making a test request
        final isValid = await _validateToken(currentUser['accessToken']);
        
        if (isValid) {
          return {
            'message': 'Auto-login successful',
            'user': currentUser,
            'autoLogin': true
          };
        } else {
          // Token expired, try to refresh
          return await _refreshToken();
        }
      }
      return null;
    } catch (error) {
      print('Auto-login error: $error');
      return null;
    }
  }

  // Validate current token
  static Future<bool> _validateToken(String accessToken) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/oauth/status'),
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json'
        }
      );

      return response.statusCode == 200;
    } catch (error) {
      return false;
    }
  }

  // Refresh expired token
  static Future<Map<String, dynamic>?> _refreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      
      if (refreshToken == null) {
        return null;
      }

      final response = await http.post(
        Uri.parse('$baseUrl/oauth/refresh-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'refreshToken': refreshToken
        })
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Update stored tokens
        await _storage.write(key: 'access_token', value: data['accessToken']);
        if (data['refreshToken'] != null) {
          await _storage.write(key: 'refresh_token', value: data['refreshToken']);
        }

        final currentUser = await getCurrentUser();
        return {
          'message': 'Token refreshed successfully',
          'user': currentUser,
          'tokenRefreshed': true
        };
      }
      return null;
    } catch (error) {
      print('Token refresh error: $error');
      return null;
    }
  }

  // Manual OAuth login (only used once)
  static Future<Map<String, dynamic>?> loginWithGoogle() async {
    try {
      // Get OAuth URL
      final response = await http.get(
        Uri.parse('$baseUrl/oauth/auth-url')
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'authUrl': data['authUrl'],
          'requiresAuth': true
        };
      }
      return null;
    } catch (error) {
      print('OAuth login error: $error');
      return null;
    }
  }

  // Handle OAuth callback
  static Future<Map<String, dynamic>?> handleOAuthCallback(String code) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/oauth/callback'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'code': code})
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final user = data['user'];
        
        // Store tokens persistently
        await _storage.write(key: 'access_token', value: user['accessToken']);
        await _storage.write(key: 'refresh_token', value: user['refreshToken']);
        await _storage.write(key: 'user_email', value: user['email']);
        await _storage.write(key: 'user_name', value: user['name']);
        await _storage.write(key: 'user_avatar', value: user['avatar']);
        
        return {
          'message': 'Login successful',
          'user': user,
          'firstLogin': false
        };
      }
      return null;
    } catch (error) {
      print('OAuth callback error: $error');
      return null;
    }
  }

  // Logout (clear persistent storage)
  static Future<void> logout() async {
    try {
      await _storage.deleteAll();
      print('Logged out successfully');
    } catch (error) {
      print('Logout error: $error');
    }
  }
}
```

## 2. Auto Auth Provider

Create `providers/auto_auth_provider.dart`:

```dart
import 'package:flutter/material.dart';
import '../services/persistent_oauth_service.dart';

class AutoAuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _error;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get error => _error;

  // Initialize with auto-login
  Future<void> initialize() async {
    _setLoading(true);
    _error = null;

    try {
      // Try auto-login first
      final autoResult = await PersistentOAuthService.autoLogin();
      
      if (autoResult != null) {
        _user = autoResult['user'];
        _isAuthenticated = true;
        print('✅ Auto-login successful: ${_user!['email']}');
      } else {
        // No stored session, show login required
        print('🔐 No stored session - login required');
      }
      
      notifyListeners();
    } catch (error) {
      _error = error.toString();
    } finally {
      _setLoading(false);
    }
  }

  // Manual login (only when needed)
  Future<void> loginWithGoogle() async {
    _setLoading(true);
    _error = null;

    try {
      final authResult = await PersistentOAuthService.loginWithGoogle();
      
      if (authResult != null) {
        // Launch OAuth URL
        // In your app, use url_launcher to open authResult['authUrl']
        print('🔐 Please login: ${authResult['authUrl']}');
      }
    } catch (error) {
      _error = error.toString();
    } finally {
      _setLoading(false);
    }
  }

  // Handle OAuth callback
  Future<void> handleOAuthCallback(String code) async {
    _setLoading(true);
    _error = null;

    try {
      final result = await PersistentOAuthService.handleOAuthCallback(code);
      
      if (result != null) {
        _user = result['user'];
        _isAuthenticated = true;
        print('✅ Login successful: ${_user!['email']}');
      } else {
        _error = 'Login failed';
      }
      
      notifyListeners();
    } catch (error) {
      _error = error.toString();
    } finally {
      _setLoading(false);
    }
  }

  // Logout
  Future<void> logout() async {
    _setLoading(true);

    try {
      await PersistentOAuthService.logout();
      _user = null;
      _isAuthenticated = false;
      _error = null;
      
      notifyListeners();
    } catch (error) {
      _error = error.toString();
    } finally {
      _setLoading(false);
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

## 3. Auto Login Screen

Create `screens/auto_login_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auto_auth_provider.dart';
import '../screens/main_screen.dart';

class AutoLoginScreen extends StatefulWidget {
  @override
  _AutoLoginScreenState createState() => _AutoLoginScreenState();
}

class _AutoLoginScreenState extends State<AutoLoginScreen> {
  @override
  void initState() {
    super.initState();
    
    // Initialize auto-login on app start
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AutoAuthProvider>(context, listen: false).initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AutoAuthProvider>(
      builder: (context, authProvider, child) {
        // Show loading while checking auth
        if (authProvider.isLoading) {
          return Scaffold(
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 20),
                  Text('Checking authentication...'),
                ],
              ),
            ),
          );
        }

        // If already authenticated, go to main screen
        if (authProvider.isAuthenticated && authProvider.user != null) {
          return MainScreen();
        }

        // If not authenticated, show login button
        return Scaffold(
          appBar: AppBar(
            title: Text('Login Required'),
          ),
          body: Center(
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.lock, size: 100, color: Colors.blue),
                  SizedBox(height: 20),
                  Text(
                    'Login Required',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 10),
                  Text(
                    'Please login to continue',
                    style: TextStyle(fontSize: 16),
                  ),
                  SizedBox(height: 30),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => authProvider.loginWithGoogle(),
                      icon: Icon(Icons.login),
                      label: Text('Login with Google'),
                      style: ElevatedButton.styleFrom(
                        padding: EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),
                  if (authProvider.error != null)
                    Padding(
                      padding: EdgeInsets.only(top: 20),
                      child: Text(
                        authProvider.error!,
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
```

## 4. Main App Setup

Update `main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auto_auth_provider.dart';
import 'screens/auto_login_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => AutoAuthProvider(),
      child: MaterialApp(
        title: 'Live Tracking',
        theme: ThemeData(primarySwatch: Colors.blue),
        home: AutoLoginScreen(),
        routes: {
          '/oauth/callback': (context) => OAuthCallbackScreen(),
        },
      ),
    );
  }
}
```

## 5. OAuth Callback Screen

Create `screens/oauth_callback_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auto_auth_provider.dart';

class OAuthCallbackScreen extends StatefulWidget {
  @override
  _OAuthCallbackScreenState createState() => _OAuthCallbackScreenState();
}

class _OAuthCallbackScreenState extends State<OAuthCallbackScreen> {
  @override
  void initState() {
    super.initState();
    
    // Handle OAuth callback automatically
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handleOAuthCallback();
    });
  }

  void _handleOAuthCallback() async {
    // Get auth code from URL parameters
    final uri = Uri.base;
    final code = uri.queryParameters['code'];
    
    if (code != null) {
      final authProvider = Provider.of<AutoAuthProvider>(context, listen: false);
      await authProvider.handleOAuthCallback(code!);
      
      // Navigate to main screen after successful login
      Navigator.of(context).pushReplacementNamed('/');
    } else {
      // Handle error
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('OAuth callback failed')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 20),
            Text('Processing login...'),
          ],
        ),
      ),
    );
  }
}
```

## 6. Usage

### **How It Works:**

1. **First Launch**: App checks for stored tokens
2. **Auto-Login**: If tokens exist and are valid, auto-login
3. **Token Refresh**: If tokens expired, automatically refresh
4. **Manual Login**: Only shown when no tokens exist
5. **Persistent Session**: User stays logged in across app restarts

### **Key Features:**

✅ **No Re-authentication**: After first login, stays logged in
✅ **Auto Token Refresh**: Handles expired tokens automatically  
✅ **Persistent Storage**: Uses secure storage for tokens
✅ **Background Auth**: Validates tokens without user interaction
✅ **Single Login**: Only needs manual login once

### **Dependencies:**

Add to `pubspec.yaml`:
```yaml
dependencies:
  flutter_secure_storage: ^9.0.0
  http: ^1.1.0
  provider: ^6.1.1
  google_sign_in: ^6.1.0
  url_launcher: ^6.1.0
```

Now users only need to login **once** and the app will automatically handle all subsequent authentication!
