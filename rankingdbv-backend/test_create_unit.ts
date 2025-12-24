
import axios from 'axios';

async function testCreateUnit() {
    try {
        console.log('1. Logging in as Admin...');
        const login = await axios.post('http://localhost:3000/auth/login', {
            email: 'admin@rankingdbv.com',
            password: 'password123'
        });
        const token = login.data.access_token;
        const user = login.data.user;
        console.log('Login success. Club ID:', user.clubId);

        if (!user.clubId) {
            console.error('User has no Club ID!');
            // Try to find a club to assign?
            // Assuming admin has club.
            return;
        }

        console.log('2. Creating Unit...');
        const unitName = `Unit Autotest ${Date.now()}`;
        const response = await axios.post('http://localhost:3000/units', {
            name: unitName,
            clubId: user.clubId
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Unit created:', response.data);

    } catch (e: any) {
        if (e.response) {
            console.error(`Error: ${e.response.status} - ${JSON.stringify(e.response.data)}`);
        } else {
            console.error('Error:', e.message);
        }
    }
}

testCreateUnit();
