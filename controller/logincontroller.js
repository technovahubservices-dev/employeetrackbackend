const Login = require('../model/loginmodel');


const jwt = require("jsonwebtoken");

const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
  try {
    const { email, password, role = "user" } = req.body;

    // Fast validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Check existing user using lean() for speed
    const existingUser = await Login.findOne({ email })
      .select("_id")
      .lean();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Faster hashing
    const hashedPassword = await bcrypt.hash(password, 8);

    // Create user directly
    const user = await Login.create({
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      lastLogin: new Date(),
    });

    // Generate token immediately
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send fast response
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Register error:", error);

    // Duplicate key error fallback
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};





exports.changeRole = async (req, res) => {

  try {

    const { email, newRole } = req.body;



    if (!['user', 'supervisor'].includes(newRole)) {

      return res.status(400).json({ message: 'Invalid role. Must be user or supervisor' });

    }



    const user = await Login.findOneAndUpdate(

      { email },

      { role: newRole },

      { new: true }

    );



    if (!user) {

      return res.status(404).json({ message: 'User not found' });

    }



    res.status(200).json({

      message: `User role changed to ${newRole} successfully`,

      user: {

        email: user.email,

        role: user.role

      }

    });



  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};






exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input quickly
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Fetch only required fields
    const user = await Login.findOne({ email })
      .select("name email role password")
      .lean(false);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Fast password compare
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Update last login WITHOUT waiting
    Login.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    ).catch(console.error);

    // Send response immediately
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
exports.supervisorlogin = async (req, res) => {

  try {

    const { email, password } = req.body;



    

    const supervisorEmail = "supervisor@admin.com";

    const supervisorPassword = "super123";



    if (email === supervisorEmail && password === supervisorPassword) {

      return res.status(200).json({

        message: "Supervisor login successful",

        user: {

          email: supervisorEmail,

          role: "supervisor"

        }

      });

    }



    const user = await Login.findOne({ email });

    if (!user) {

      return res.status(401).json({ message: 'User not found' });

    }



    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {

      return res.status(401).json({ message: 'Invalid password' });

    }



    res.status(200).json({ 

      message: 'Login successful', 

      user: {

        email: user.email,

        role: user.role

      }

    });



  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};



exports. getUsers = async (req, res) => {
  try {
    // Find documents where role = 'user', select only email and role
    const users = await Login.find({ role: 'user' }, 'email role');
    
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    res.status(200).json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};



exports.deleteUser = async (req, res) => {

  try {

    const { id } = req.params;



    const deletedUser = await Login.findByIdAndDelete(id);



    if (!deletedUser) {

      return res.status(404).json({ message: "User not found" });

    }



    res.status(200).json({

      message: "User deleted successfully"

    });



  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};

