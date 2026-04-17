const express = require('express');
const router = express.Router();

// Sample employee data - replace with your database
let employees = [
  {
    _id: 'EMP001',
    name: 'John Doe',
    lat: 11.1271,
    lng: 78.6569
  },
  {
    _id: 'EMP002', 
    name: 'Jane Smith',
    lat: 11.1275,
    lng: 78.6575
  }
];

// GET all employees with their locations
router.get('/employees', (req, res) => {
  try {
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
});

// POST update employee location (if needed later)
router.post('/location', (req, res) => {
  try {
    const { employeeId, lat, lng } = req.body;
    
    // Find and update employee location
    const employeeIndex = employees.findIndex(emp => emp._id === employeeId);
    if (employeeIndex !== -1) {
      employees[employeeIndex].lat = lat;
      employees[employeeIndex].lng = lng;
      res.status(200).json({ message: 'Location updated successfully' });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating location', error: error.message });
  }
});

module.exports = router;
