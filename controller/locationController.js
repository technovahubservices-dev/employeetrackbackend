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

const { getLocationName } = require('../utils/locationUtils');
const { getLocationNameOSM } = require('../utils/oprnStreetMapUtils');

exports.sendLocationToSupervisor = async (req, res) => {
    try {
        const { employeeId, email, name, message, lat, lng } = req.body;

        if (!employeeId || !email || !lat || !lng) {
            return res.status(400).json({ 
                message: 'employeeId, email, lat, and lng are required' 
            });
        }

        // Get address from coordinates (try Google Maps first, then fallback to OSM)
        let address = await getLocationName(parseFloat(lat), parseFloat(lng));
        
        // If Google Maps fails, try OpenStreetMap
        if (address === `Location at ${lat}, ${lng}`) {
            console.log('Google Maps failed, trying OpenStreetMap...');
            address = await getLocationNameOSM(parseFloat(lat), parseFloat(lng));
        }
        
        console.log('Final location address:', address);

        // Save location to Location collection with address
        const location = new Location({
            employeeId,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            address: address  // Add address field
        });
        await location.save();

        // Save to supervisor collection with address
        const supervisor = require('../model/supervisormodel');
        const supervisorData = new supervisor({
            name: name || employeeId,
            email,
            message: message || `Location update from ${employeeId} - ${address}`,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            address: address  // Add address field
        });
        await supervisorData.save();

        res.status(201).json({ 
            message: 'Location sent to supervisor successfully',
            locationData: location,
            supervisorData: supervisorData,
            address: address
        });
    } catch (error) {
        console.error('Error in sendLocationToSupervisor:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get all locations for supervisor dashboard
exports.getAllLocations = async (req, res) => {
    try {
        console.log('=== GET ALL LOCATIONS ===');
        
        // Get all locations from Location collection
        const locations = await Location.find({})
            .sort({ timestamp: -1 })
            .limit(100); // Limit to last 100 locations

        console.log(`Found ${locations.length} locations`);

        if (locations.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No locations found',
                data: []
            });
        }

        // Format location data
        const locationList = locations.map(location => ({
            _id: location._id,
            employeeId: location.employeeId,
            lat: location.lat,
            lng: location.lng,
            address: location.address || `Location at ${location.lat}, ${location.lng}`,
            timestamp: location.timestamp
        }));

        console.log('Location list created:', locationList.length, 'locations');

        res.status(200).json({
            success: true,
            message: 'Locations retrieved successfully',
            data: locationList,
            total: locationList.length
        });

    } catch (error) {
        console.error('Error getting all locations:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving locations',
            error: error.message
        });
    }
};