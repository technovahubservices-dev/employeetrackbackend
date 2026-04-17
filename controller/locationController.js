const Location = require('../model/Location');

exports.saveLocation = async (req, res) => {
    try {
        const { employeeId, lat, lng } = req.body;

        if (!employeeId || !lat || !lng) {
            return res.status(400).json({ 
                message: 'employeeId, lat, and lng are required' 
            });
        }

        const location = new Location({
            employeeId,
            lat: parseFloat(lat),
            lng: parseFloat(lng)
        });

        await location.save();

        res.status(201).json({ 
            message: 'Location saved successfully',
            data: location
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getLocations = async (req, res) => {
    try {
        const { employeeId } = req.query;
        
        let query = {};
        if (employeeId) {
            query.employeeId = employeeId;
        }

        const locations = await Location.find(query).sort({ timestamp: -1 });
        
        res.status(200).json({
            message: 'Locations retrieved successfully',
            data: locations
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getLatestLocation = async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        if (!employeeId) {
            return res.status(400).json({ 
                message: 'employeeId is required' 
            });
        }

        const location = await Location.findOne({ employeeId })
            .sort({ timestamp: -1 });
        
        if (!location) {
            return res.status(404).json({ 
                message: 'No location found for this employee' 
            });
        }

        res.status(200).json({
            message: 'Latest location retrieved successfully',
            data: location
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getLocationsByEmployeeId = async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        if (!employeeId) {
            return res.status(400).json({ 
                message: 'employeeId is required' 
            });
        }

        const locations = await Location.find({ employeeId })
            .sort({ timestamp: -1 });
        
        if (!locations || locations.length === 0) {
            return res.status(404).json({ 
                message: 'No locations found for this employee' 
            });
        }

        res.status(200).json({
            message: 'Locations retrieved successfully',
            data: locations
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.sendLocationToSupervisor = async (req, res) => {
    try {
        const { employeeId, email, name, message, lat, lng } = req.body;

        if (!employeeId || !email || !lat || !lng) {
            return res.status(400).json({ 
                message: 'employeeId, email, lat, and lng are required' 
            });
        }

        // Save location to Location collection
        const location = new Location({
            employeeId,
            lat: parseFloat(lat),
            lng: parseFloat(lng)
        });
        await location.save();

        // Save to supervisor collection with location
        const supervisor = require('../model/supervisormodel');
        const supervisorData = new supervisor({
            name: name || employeeId,
            email,
            message: message || `Location update from ${employeeId}`,
            lat: parseFloat(lat),
            lng: parseFloat(lng)
        });
        await supervisorData.save();

        res.status(201).json({ 
            message: 'Location sent to supervisor successfully',
            locationData: location,
            supervisorData: supervisorData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
