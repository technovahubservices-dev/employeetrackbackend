const userdata = require('../model/usercredential');


exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await userdata.findByIdAndDelete(id);

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
