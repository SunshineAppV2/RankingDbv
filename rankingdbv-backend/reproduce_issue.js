


const API_URL = 'http://localhost:3000';

async function testUpdate() {
    try {
        console.log('1. Logging in as Master...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'master@rankingdbv.com',
                password: '123456'
            })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('Login successful.');

        // Get Members
        console.log('2. Fetching members...');
        const membersRes = await fetch(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const members = await membersRes.json();
        const member = members.find(u => u.email === 'member@test.com');

        if (!member) {
            console.log('Member member@test.com not found. Creating it...');
            // Optional: Create member if missing
            return;
        }
        console.log(`Found member: ${member.name} (${member.id})`);

        // Get Units
        console.log('3. Fetching units...');
        // Assuming Master Club ID is accessible
        const clubId = member.clubId;
        const unitsRes = await fetch(`${API_URL}/units/club/${clubId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const units = await unitsRes.json();
        const unit = units[0];

        if (!unit) throw new Error('No unit found in club.');
        console.log(`Found unit: ${unit.name} (${unit.id})`);

        console.log('4. Attempting to update member unit...');

        const payload = {
            name: member.name, // Send name as well, as frontend does
            unitId: unit.id
        };

        const updateRes = await fetch(`${API_URL}/users/${member.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (updateRes.ok) {
            const updatedUser = await updateRes.json();
            console.log('Update SUCCESS!');
            console.log('Updated Unit ID:', updatedUser.unitId);
        } else {
            const err = await updateRes.text();
            console.error('Update FAILED');
            console.error('Status:', updateRes.status);
            console.error('Response:', err);
        }

    } catch (error) {
        console.error('Test Error:', error);
    }
}

testUpdate();
