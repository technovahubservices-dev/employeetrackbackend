const userdata = require('../model/usercredential');


exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await userdata.findByIdAndUpdate(
      id,
      req.body,              
      { new: true }          
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      data: updatedUser
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
