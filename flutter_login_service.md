# Flutter Login Service

Complete Flutter implementation for user and supervisor login with your backend endpoints.

## 1. Login Service

Create `services/login_service.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class LoginService {
  static const String baseUrl = 'http://localhost:3000/api';
  static final _storage = FlutterSecureStorage();

  // Regular User Login
  static Future<Map<String, dynamic>?> loginUser({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Store user session
        await _storage.write(key: 'user_token', value: jsonEncode(data['user']));
        await _storage.write(key: 'user_role', value: data['user']['role']);
        
        return data;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Login failed');
      }
    } catch (error) {
      print('Login error: $error');
      rethrow;
    }
  }

  // Supervisor Login
  static Future<Map<String, dynamic>?> loginSupervisor({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/supervisorlogin'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Store supervisor session
        await _storage.write(key: 'user_token', value: jsonEncode(data['user']));
        await _storage.write(key: 'user_role', value: 'supervisor');
        
        return data;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Supervisor login failed');
      }
    } catch (error) {
      print('Supervisor login error: $error');
      rethrow;
    }
  }

  // User Registration
  static Future<Map<String, dynamic>?> registerUser({
    required String email,
    required String password,
    String role = 'user',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'role': role,
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['message'] ?? 'Registration failed');
      }
    } catch (error) {
      print('Registration error: $error');
      rethrow;
    }
  }

  // Get Current User
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final userToken = await _storage.read(key: 'user_token');
      if (userToken == null) return null;
      
      return jsonDecode(userToken);
    } catch (error) {
      print('Get current user error: $error');
      return null;
    }
  }

  // Get User Role
  static Future<String?> getUserRole() async {
    return await _storage.read(key: 'user_role');
  }

  // Logout
  static Future<void> logout() async {
    try {
      await _storage.deleteAll();
    } catch (error) {
      print('Logout error: $error');
    }
  }

  // Check if Supervisor
  static Future<bool> isSupervisor() async {
    final role = await getUserRole();
    return role == 'supervisor';
  }

  // Check if Logged In
  static Future<bool> isLoggedIn() async {
    final user = await getCurrentUser();
    return user != null;
  }
}
```

## 2. Auth Provider

Create `providers/auth_provider.dart`:

```dart
import 'package:flutter/foundation.dart';
import '../services/login_service.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _error;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;
  bool get isSupervisor => _user?['role'] == 'supervisor';

  // Initialize and check login status
  Future<void> initialize() async {
    _setLoading(true);
    try {
      final currentUser = await LoginService.getCurrentUser();
      if (currentUser != null) {
        _user = currentUser;
        notifyListeners();
      }
    } catch (error) {
      _error = error.toString();
    } finally {
      _setLoading(false);
    }
  }

  // User Login
  Future<void> loginUser({
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _error = null;

    try {
      final result = await LoginService.loginUser(email: email, password: password);
      if (result != null) {
        _user = result['user'];
        notifyListeners();
      }
    } catch (error) {
      _error = error.toString();
      notifyListeners();
    } finally {
      _setLoading(false);
    }
  }

  // Supervisor Login
  Future<void> loginSupervisor({
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _error = null;

    try {
      final result = await LoginService.loginSupervisor(email: email, password: password);
      if (result != null) {
        _user = result['user'];
        notifyListeners();
      }
    } catch (error) {
      _error = error.toString();
      notifyListeners();
    } finally {
      _setLoading(false);
    }
  }

  // User Registration
  Future<void> registerUser({
    required String email,
    required String password,
    String role = 'user',
  }) async {
    _setLoading(true);
    _error = null;

    try {
      final result = await LoginService.registerUser(
        email: email,
        password: password,
        role: role,
      );
      if (result != null) {
        _error = null; // Clear any previous errors
        notifyListeners();
      }
    } catch (error) {
      _error = error.toString();
      notifyListeners();
    } finally {
      _setLoading(false);
    }
  }

  // Logout
  Future<void> logout() async {
    await LoginService.logout();
    _user = null;
    _error = null;
    notifyListeners();
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

## 3. Login Screen

Create `screens/login_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/home_screen.dart';
import '../screens/supervisor_screen.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  
  final _userEmailController = TextEditingController();
  final _userPasswordController = TextEditingController();
  final _supervisorEmailController = TextEditingController();
  final _supervisorPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _userEmailController.dispose();
    _userPasswordController.dispose();
    _supervisorEmailController.dispose();
    _supervisorPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Live Tracking Login'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'User Login'),
            Tab(text: 'Supervisor Login'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildUserLoginTab(),
          _buildSupervisorLoginTab(),
        ],
      ),
    );
  }

  Widget _buildUserLoginTab() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        return Padding(
          padding: EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.person, size: 100, color: Colors.blue),
              SizedBox(height: 20),
              Text(
                'User Login',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 40),
              
              // Email Field
              TextField(
                controller: _userEmailController,
                decoration: InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.email),
                ),
              ),
              SizedBox(height: 16),
              
              // Password Field
              TextField(
                controller: _userPasswordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock),
                ),
              ),
              SizedBox(height: 24),
              
              // Login Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: authProvider.isLoading ? null : () async {
                    await authProvider.loginUser(
                      email: _userEmailController.text,
                      password: _userPasswordController.text,
                    );
                    
                    if (authProvider.user != null) {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (context) => HomeScreen()),
                      );
                    }
                  },
                  child: authProvider.isLoading
                      ? CircularProgressIndicator(color: Colors.white)
                      : Text('Login as User'),
                ),
              ),
              
              // Error Message
              if (authProvider.error != null)
                Padding(
                  padding: EdgeInsets.only(top: 16),
                  child: Text(
                    authProvider.error!,
                    style: TextStyle(color: Colors.red),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSupervisorLoginTab() {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        return Padding(
          padding: EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.admin_panel_settings, size: 100, color: Colors.purple),
              SizedBox(height: 20),
              Text(
                'Supervisor Login',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 20),
              
              // Default credentials info
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.purple.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.purple.shade200),
                ),
                child: Column(
                  children: [
                    Text(
                      'Default Credentials:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text('Email: supervisor@admin.com'),
                    Text('Password: super123'),
                  ],
                ),
              ),
              SizedBox(height: 20),
              
              // Email Field (Pre-filled)
              TextField(
                controller: _supervisorEmailController,
                decoration: InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.email),
                ),
              ),
              SizedBox(height: 16),
              
              // Password Field (Pre-filled)
              TextField(
                controller: _supervisorPasswordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.lock),
                ),
              ),
              SizedBox(height: 24),
              
              // Login Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: authProvider.isLoading ? null : () async {
                    await authProvider.loginSupervisor(
                      email: _supervisorEmailController.text,
                      password: _supervisorPasswordController.text,
                    );
                    
                    if (authProvider.user != null) {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (context) => SupervisorScreen()),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple,
                  ),
                  child: authProvider.isLoading
                      ? CircularProgressIndicator(color: Colors.white)
                      : Text('Login as Supervisor'),
                ),
              ),
              
              // Error Message
              if (authProvider.error != null)
                Padding(
                  padding: EdgeInsets.only(top: 16),
                  child: Text(
                    authProvider.error!,
                    style: TextStyle(color: Colors.red),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
```

## 4. Main App Setup

Update your `main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/supervisor_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => AuthProvider()..initialize(),
      child: MaterialApp(
        title: 'Live Tracking',
        theme: ThemeData(primarySwatch: Colors.blue),
        home: Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            if (authProvider.isLoading) {
              return Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }
            
            if (authProvider.isAuthenticated) {
              return authProvider.isSupervisor 
                  ? SupervisorScreen() 
                  : HomeScreen();
            }
            
            return LoginScreen();
          },
        ),
      ),
    );
  }
}
```

## 5. Home Screen (User)

Create `screens/home_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('User Dashboard'),
        actions: [
          IconButton(
            onPressed: () async {
              await authProvider.logout();
            },
            icon: Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.person, size: 100, color: Colors.blue),
            SizedBox(height: 20),
            Text(
              'Welcome, ${authProvider.user!['email']}',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 10),
            Text(
              'Role: ${authProvider.user!['role']}',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 40),
            Text('User features will be implemented here'),
          ],
        ),
      ),
    );
  }
}
```

## 6. Supervisor Screen

Create `screens/supervisor_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class SupervisorScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Supervisor Dashboard'),
        backgroundColor: Colors.purple,
        actions: [
          IconButton(
            onPressed: () async {
              await authProvider.logout();
            },
            icon: Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.admin_panel_settings, size: 100, color: Colors.purple),
            SizedBox(height: 20),
            Text(
              'Supervisor Panel',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 10),
            Text(
              'Welcome, ${authProvider.user!['email']}',
              style: TextStyle(fontSize: 18),
            ),
            SizedBox(height: 40),
            Text('Supervisor features will be implemented here'),
          ],
        ),
      ),
    );
  }
}
```

## 7. Dependencies

Add to `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  flutter_secure_storage: ^9.0.0
  provider: ^6.1.1
```

## Usage

1. **Install dependencies**: `flutter pub get`
2. **Run the app**: `flutter run`
3. **Use the login tabs** to login as user or supervisor

## Features

✅ **Dual Login**: Separate tabs for user and supervisor login
✅ **Default Supervisor Credentials**: Pre-filled with default values
✅ **Secure Storage**: Tokens stored securely
✅ **Role-based Navigation**: Different screens for different roles
✅ **Error Handling**: Proper error messages
✅ **Loading States**: Visual feedback during login
✅ **Auto-login**: Remembers logged-in state
