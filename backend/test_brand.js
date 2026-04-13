import axios from 'axios';

async function testEndpoint() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@techturf.com',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('Login successful');

        const brandRes = await axios.get('http://localhost:5000/api/brandpilot/brand', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Brand res:', brandRes.data);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

testEndpoint();
