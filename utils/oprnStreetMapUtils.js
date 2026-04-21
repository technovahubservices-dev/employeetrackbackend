const https = require('https');

// Free alternative using OpenStreetMap Nominatim API
async function getLocationNameOSM(lat, lng) {
    return new Promise((resolve, reject) => {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        
        console.log('=== OSM GEOCODING DEBUG ===');
        console.log('Request URL:', url);
        
        const request = https.get(url, {
            headers: {
                'User-Agent': 'LiveTrackerApp/1.0'
            }
        }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    console.log('OSM Response Status:', response.statusCode);
                    const result = JSON.parse(data);
                    console.log('OSM Result:', result);
                    
                    if (result.display_name) {
                        console.log('OSM Address:', result.display_name);
                        resolve(result.display_name);
                    } else {
                        console.log('OSM: No address found');
                        resolve(`Location at ${lat}, ${lng}`);
                    }
                } catch (error) {
                    console.error('OSM Parse Error:', error);
                    resolve(`Location at ${lat}, ${lng}`);
                }
            });
        });
        
        request.on('error', (error) => {
            console.error('OSM Request Error:', error);
            resolve(`Location at ${lat}, ${lng}`);
        });
        
        request.setTimeout(5000, () => {
            request.destroy();
            resolve(`Location at ${lat}, ${lng}`);
        });
    });
}

module.exports = {
    getLocationNameOSM
};