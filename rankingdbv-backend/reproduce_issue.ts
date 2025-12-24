
import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function testUpdate() {
    try {
        console.log('1. Logging in as Master...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'master@rankingdbv.com',
            password: '123456'
        });
        const token = loginRes.data.access_token;
        console.log('Login successful. Token obtained.');

        // Get Members to find one
        const membersRes = await axios.get(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const member = membersRes.data.find((u: any) => u.email === 'member@test.com');
        if (!member) throw new Error('Member not found');
        console.log(`Found member: ${member.name} (${member.id})`);

        // Get Unit
        const clubId = member.clubId;
        const unitsRes = await axios.get(`${API_URL}/units/club/${clubId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const unit = unitsRes.data[0];
        if (!unit) throw new Error('No unit found');
        console.log(`Found unit: ${unit.name} (${unit.id})`);

        console.log('2. Attempting to update member unit...');
        // Payload mimicking what the frontend sends (roughly)
        // Note: Frontend sends minimal fields if we filtered correctly, but let's test what happens if we send just what we want.

        const payload = {
            unitId: unit.id
        };

        const updateRes = await axios.patch(`${API_URL}/users/${member.id}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Update SUCCESS!');
        console.log('Response:', updateRes.data);

    } catch (error: any) {
        console.error('Update FAILED');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testUpdate();
