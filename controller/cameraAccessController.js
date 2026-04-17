const mongoose = require('mongoose');

// Camera access control schema
const CameraAccessSchema = new mongoose.Schema({
  supervisorId: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  cameraEnabled: {
    type: Boolean,
    default: false
  },
  enabledAt: {
    type: Date,
    default: Date.now
  },
  enabledBy: {
    type: String,
    required: true
  }
});

const CameraAccess = mongoose.model('CameraAccess', CameraAccessSchema);

// Get camera access status for employee
exports.getCameraAccess = async (req, res) => {
  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required'
      });
    }

    const access = await CameraAccess.findOne({ employeeId })
      .sort({ enabledAt: -1 })
      .limit(1);

    res.status(200).json({
      success: true,
      cameraEnabled: access ? access.cameraEnabled : false,
      enabledAt: access ? access.enabledAt : null,
      enabledBy: access ? access.enabledBy : null
    });
  } catch (error) {
    console.error('❌ Get camera access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get camera access status',
      error: error.message
    });
  }
};

// Enable/disable camera access for employee
exports.setCameraAccess = async (req, res) => {
  try {
    const { employeeId, cameraEnabled, supervisorId } = req.body;

    if (!employeeId || cameraEnabled === undefined || !supervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, camera status, and supervisor ID are required'
      });
    }

    // Create new camera access record
    const cameraAccess = new CameraAccess({
      employeeId,
      cameraEnabled,
      supervisorId,
      enabledBy: supervisorId
    });

    await cameraAccess.save();

    console.log(`📹 Camera ${cameraEnabled ? 'enabled' : 'disabled'} for employee: ${employeeId} by supervisor: ${supervisorId}`);

    res.status(200).json({
      success: true,
      message: `Camera access ${cameraEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        employeeId,
        cameraEnabled,
        enabledBy: supervisorId,
        enabledAt: cameraAccess.enabledAt
      }
    });
  } catch (error) {
    console.error('❌ Set camera access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set camera access',
      error: error.message
    });
  }
};

// Get all employees with camera access status
exports.getAllCameraAccess = async (req, res) => {
  try {
    const { supervisorId } = req.query;

    if (!supervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Supervisor ID is required'
      });
    }

    const accessRecords = await CameraAccess.aggregate([
      {
        $match: { supervisorId }
      },
      {
        $sort: { enabledAt: -1 }
      },
      {
        $group: {
          _id: '$employeeId',
          latestAccess: { $first: '$$ROOT' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: accessRecords.map(record => ({
        employeeId: record._id,
        cameraEnabled: record.latestAccess.cameraEnabled,
        enabledAt: record.latestAccess.enabledAt,
        enabledBy: record.latestAccess.enabledBy
      }))
    });
  } catch (error) {
    console.error('❌ Get all camera access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get camera access records',
      error: error.message
    });
  }
};
