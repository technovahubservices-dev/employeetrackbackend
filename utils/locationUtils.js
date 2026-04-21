const https = require('https');

// Function to get location name from coordinates using reverse geocoding
async function getLocationName(lat, lng) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        
        console.log('=== GEOCODING DEBUG ===');
        console.log('API Key exists:', !!apiKey);
        console.log('Coordinates:', lat, lng);
        
        if (!apiKey) {
            console.log('No API key found, using fallback');
            return resolve(`Lat: ${lat}, Lng: ${lng}`);
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        console.log('Request URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));
        
        const request = https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    console.log('Geocoding response status:', response.statusCode);
                    const result = JSON.parse(data);
                    console.log('Geocoding result:', result);
                    
                    if (result.status === 'OK' && result.results.length > 0) {
                        const address =
                            result.results[0].formatted_address ||
                            result.results[0].address_components?.[0]?.long_name ||
                            `Location at ${lat}, ${lng}`;

                        console.log('Resolved address:', address);
                        resolve(address);
                    } else {
                        console.log('Geocoding failed:', result.status);
                        resolve(`Location at ${lat}, ${lng}`);
                    }
                } catch (error) {
                    console.error('Geocoding parse error:', error);
                    resolve(`Location at ${lat}, ${lng}`);
                }
            });
        });
        
        request.on('error', (error) => {
            console.error('Geocoding request error:', error);
            resolve(`Location at ${lat}, ${lng}`);
        });
        
        request.setTimeout(5000, () => {
            console.log('Geocoding request timeout');
            request.destroy();
            resolve(`Location at ${lat}, ${lng}`);
        });
    });
}

// Cache
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