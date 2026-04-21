const Login = require('../model/loginmodel');

// Get all registered users with detailed information
exports.getAllUsers = async (req, res) => {
  try {
    console.log('=== GET ALL USERS DEBUG START ===');
    
    // Find all users, exclude password field for security
    const users = await Login.find({}, '-password');
    
    console.log(`Found ${users.length} users in database`);
    
    if (!users || users.length === 0) {
      console.log('No users found in database');
      return res.status(404).json({
        success: false,
        message: 'No users found',
        data: []
      });
    }

    // Format user data for response
    const formattedUsers = users.map(user => ({
      id: user._id,
      email: user.email,
      name: user.name || 'Not provided',
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    console.log('Formatted users data:');
    formattedUsers.forEach(user => {
      console.log(`- ${user.email} | Role: ${user.role} | Name: ${user.name} | Last Login: ${user.lastLogin || 'Never'}`);
    });

    console.log('=== GET ALL USERS DEBUG END ===');

    res.status(200).json({
      success: true,
      message: `Found ${users.length} registered users`,
      count: users.length,
      data: formattedUsers
    });

  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};