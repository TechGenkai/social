const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testCloudinaryUpload() {
    try {
        // Create form data
        const formData = new FormData();
        formData.append('profilePic', fs.createReadStream(path.join(__dirname, 'public/images/default-profile.png')));
        formData.append('username', 'testuser');

        // Make the request
        const response = await axios.post('http://localhost:4000/upload-profile-pic', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log('Upload Response:', response.data);
        
        if (response.data.success && response.data.profilePic) {
            console.log('✅ Cloudinary upload successful!');
            console.log('Profile picture URL:', response.data.profilePic);
        } else {
            console.log('❌ Upload failed or unexpected response format');
        }
    } catch (error) {
        console.error('❌ Error testing Cloudinary upload:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testCloudinaryUpload(); 