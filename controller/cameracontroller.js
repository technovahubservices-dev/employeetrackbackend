const Toggle = require('../model/cameramodel');

// Save toggle value
exports.saveToggle = async (req, res) => {
  try {
    const { status, captureOnly = true } = req.body; // captureOnly = true means don't show on screen

    const toggle = new Toggle({ 
      status,
      captureOnly // Store whether to show image or just capture
    });
    await toggle.save();

    res.status(200).json({
      message: "Camera settings saved",
      data: {
        status,
        captureOnly,
        displayImage: !captureOnly // Opposite for frontend
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update toggle value
exports.updateToggle = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, captureOnly } = req.body;

    const updated = await Toggle.findByIdAndUpdate(
      id,
      { 
        status,
        captureOnly,
        displayImage: !captureOnly
      },
      { new: true }
    );

    res.status(200).json({
      message: "Camera settings updated",
      data: updated
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get camera settings
exports.getCameraSettings = async (req, res) => {
  try {
    const settings = await Toggle.findOne().sort({ createdAt: -1 });
    
    res.status(200).json({
      message: "Camera settings retrieved",
      data: settings || { status: 0, captureOnly: true, displayImage: false }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
