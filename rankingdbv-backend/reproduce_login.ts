import axios from 'axios';

async function run() {
    try {
        console.log('Attempting to login...');
        // Using a known test user or trying a common one
        const response = await axios.post('http://localhost:3000/auth/login', {
            email: 'test@rankingdbv.com',
            password: 'password123'
        });
        console.log('Success:', response.status);
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            console.error('Error: Connection Refused. Server might be down.');
        } else if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

run();
