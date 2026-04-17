require('dotenv').config();

console.log('🎯 Final OAuth Test\n');
console.log('✅ Environment loaded successfully!');

const http = require('http'); // Changed from https to http

async function testOAuth() {
  try {
    console.log('1️⃣ Testing OAuth auth URL endpoint...');
    
    const authPromise = new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000/oauth/auth-url'); // Changed to http
        
      let data = '';
      req.on('data', (chunk) => data += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Request timeout')));
    });
    
    const authResult = await authPromise;
    
    if (authResult.success) {
      console.log('✅ OAuth endpoint working!');
      console.log('📋 Auth URL:', authResult.authUrl.substring(0, 50) + '...');
      console.log('');
      
      console.log('2️⃣ Testing OAuth status endpoint...');
      
      const statusPromise = new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/oauth/status'); // Changed to http
        
        let data = '';
        req.on('data', (chunk) => data += chunk);
        req.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Request timeout')));
      });
      
      const statusResult = await statusPromise;
      
      console.log('📊 Status:', statusResult.authenticated ? 'Authenticated' : 'Not Authenticated');
      
      if (!statusResult.authenticated) {
        console.log('');
        console.log('🚀 Ready for OAuth Flow!');
        console.log('📋 Visit this URL to authenticate:');
        console.log('   ', authResult.authUrl);
        console.log('');
        console.log('📤 After authentication, upload with:');
        console.log('   curl -X POST -F "video=@uploads/video.mp4" -F "employeeId=EMP001" http://localhost:3000/upload-to-personal-drive');
      } else {
        console.log('✅ Already authenticated!');
        console.log('📤 Ready to upload videos!');
      }
    } else {
      console.log('❌ OAuth endpoint failed:', authResult.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('💡 Make sure server is running: node server.js');
  }
}

testOAuth();
