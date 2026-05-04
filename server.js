const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); 

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded videos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('Static file serving configured for /uploads');

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
const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL;

if (!mongoUri) {
  console.warn(
    'MongoDB connection skipped: set MONGO_URI in .env or environment variables.'
  );
} else {
  mongoose.connect(mongoUri)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log("MongoDB Connection Error:", err.message));
}

// Load routes
const Routes = require('./route/route');
app.use('/api', Routes);

app.use('/uploads', express.static('uploads'));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the API at: http://localhost:${PORT}`);
});
  
