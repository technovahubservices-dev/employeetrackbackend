const https = require('https');

// Function to get location name from coordinates using reverse geocoding
async function getLocationName(lat, lng) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
            // Fallback: return coordinates if no API key
            resolve(`Lat: ${lat}, Lng: ${lng}`);
            return;
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        
        const request = https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    if (result.status === 'OK' && result.results.length > 0) {
                        // Get the formatted address or use the first address component
                        const address = result.results[0].formatted_address || 
                                     result.results[0].address_components?.[0]?.long_name ||
                                     `Location at ${lat}, ${lng}`;
                        resolve(address);
                    } else {
                        resolve(`Location at ${lat}, ${lng}`);
                    }
                } catch (error) {
                    console.error('Geocoding error:', error);
                    resolve(`Location at ${lat}, ${lng}`);
                }
            });
        });
        
        request.on('error', (error) => {
            console.error('Geocoding request error:', error);
            resolve(`Location at ${lat}, ${lng}`);
        });
        
        request.setTimeout(5000, () => {
            request.destroy();
            resolve(`Location at ${lat}, ${lng}`);
        });
    });
}

// Function to get location name with caching
const locationCache = new Map();

async function getCachedLocationName(lat, lng) {
    const key = `${lat},${lng}`;
    
    if (locationCache.has(key)) {
        return locationCache.get(key);
    }
    
    const locationName = await getLocationName(lat, lng);
    locationCache.set(key, locationName);
    
    // Clear cache after 1 hour
    setTimeout(() => {
        locationCache.delete(key);
    }, 3600000);
    
    return locationName;
}

module.exports = {
    getLocationName,
    getCachedLocationName
};
