const userdata = require('../model/usercredential');

exports.getUserData = async (req, res) => {
  try {
    console.log(' Fetching user data from database...');
    const users = await userdata.find();  
    
    console.log(` Found ${users.length} users in database`);
    
    // Always return an array, even if empty
    const response = {
      success: true,
      users: users,
      count: users.length
    };
    
    console.log(' Users found, returning data');
    res.status(200).json(response);
    
  } catch (error) {
    console.error(' Error fetching user data:', error.message);
    res.status(500).json({ 
      success: false, 
      users: [],
      count: 0,
      message: 'Failed to fetch user data',
      error: error.message 
    });
  }
};
