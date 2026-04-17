require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'LiveTracker Backend API is running!',
    status: 'Active',
    endpoints: {
      location: '/api/location',
      locationToSupervisor: '/api/location-to-supervisor',
      messages: '/api/message',
      getMessage: '/api/getmessage'
    },
    timestamp: new Date().toISOString()
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Connection Error:", err.message));

// Load routes
const Routes = require('./route/route');
app.use('/api', Routes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the API at: http://localhost:${PORT}`);
});
