const supervisor = require('../model/supervisormodel');
const Login = require('../model/loginmodel');
const bcrypt = require('bcrypt');
const { getCachedLocationName } = require('../utils/locationUtils');

exports.supervisor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new Login({ email, password: hashedPassword, role: 'supervisor' });
    await user.save();

    res.status(201).json({ 
      message: 'Supervisor registered successfully',
      user: {
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.savedata=async  (req,res)=>{

  try{

    const { name,email,message,lat,lng}=req.body;

    const   data=new supervisor({email,name,message,lat,lng});

    await data.save();

    res.status(201).json({message:"data saved successfully"});

  } catch(error){
    res.status(500).json({message:error.message});
  }
};


exports.getMessages=async (req,res)=>{

  try{

    const messages=await supervisor.find().sort({createdAt:-1});

    // Add location names to messages with coordinates
    const messagesWithLocationNames = await Promise.all(
      messages.map(async (message) => {
        const messageObj = message.toObject();
        
        if (message.lat && message.lng) {
          try {
            const locationName = await getCachedLocationName(message.lat, message.lng);
            messageObj.locationName = locationName;
          } catch (error) {
            console.error('Error getting location name:', error);
            messageObj.locationName = `Location at ${message.lat}, ${message.lng}`;
          }
        } else {
          messageObj.locationName = 'No location data';
        }
        
        return messageObj;
      })
    );

    res.status(200).json({
      message:"messages retrieved successfully",
      data:messagesWithLocationNames
    });

  } catch(error){
    res.status(500).json({message:error.message});
  }
};

// Get messages by email
exports.getMessagesByEmail=async (req,res)=>{

  try{

    const {email}=req.params;

    const messages=await supervisor.find({email:email}).sort({createdAt:-1});

    // Add location names to messages with coordinates
    const messagesWithLocationNames = await Promise.all(
      messages.map(async (message) => {
        const messageObj = message.toObject();
        
        if (message.lat && message.lng) {
          try {
            const locationName = await getCachedLocationName(message.lat, message.lng);
            messageObj.locationName = locationName;
          } catch (error) {
            console.error('Error getting location name:', error);
            messageObj.locationName = `Location at ${message.lat}, ${message.lng}`;
          }
        } else {
          messageObj.locationName = 'No location data';
        }
        
        return messageObj;
      })
    );

    res.status(200).json({
      message:"messages retrieved successfully",
      data:messagesWithLocationNames
    });

  } catch(error){
    res.status(500).json({message:error.message});
  }
};
