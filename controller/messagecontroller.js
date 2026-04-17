const supervisor = require('../model/supervisemodel');

// Get all messages
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await supervisor.find().sort({ _id: -1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
