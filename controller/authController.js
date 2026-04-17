const User = require('../models/User');
const bcrypt = require('bcrypt');

// Login controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Return user info (excluding password)
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Get all users (for supervisor dashboard)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'email role createdAt');
    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Create default supervisor if not exists
exports.createDefaultSupervisor = async () => {
  try {
    const existingSupervisor = await User.findOne({ email: 'supervisor@technova.com' });
    
    if (!existingSupervisor) {
      const hashedPassword = await bcrypt.hash('supervisor@technova', 10);
      
      const supervisor = new User({
        email: 'supervisor@technova.com',
        password: hashedPassword,
        role: 'supervisor'
      });
      
      await supervisor.save();
      console.log('✅ Default supervisor created: supervisor@technova.com');
    }
  } catch (error) {
    console.error('Error creating default supervisor:', error);
  }
};
