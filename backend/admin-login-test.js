import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testAdminLogin() {
    console.log('=== Testing Admin Login ===');
    
    try {
        // Test login with admin credentials
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@techturf.com',
                password: 'admin123'
            })
        });

        console.log('Login response status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('Login successful!');
            console.log('Token:', loginData.token);
            console.log('User role:', loginData.user?.role);
            
            // Test accessing admin-only endpoint
            const ordersResponse = await fetch(`${API_BASE}/orders`, {
                headers: {
                    'Authorization': `Bearer ${loginData.token}`
                }
            });
            
            console.log('Orders endpoint status:', ordersResponse.status);
            
            if (ordersResponse.ok) {
                console.log('Admin access verified - can access orders');
                const orders = await ordersResponse.json();
                console.log(`Found ${orders.length} orders`);
            } else {
                const errorData = await ordersResponse.json();
                console.log('Admin access failed:', errorData.message);
            }
            
            // Test accessing products endpoint
            const productsResponse = await fetch(`${API_BASE}/products`, {
                headers: {
                    'Authorization': `Bearer ${loginData.token}`
                }
            });
            
            console.log('Products endpoint status:', productsResponse.status);
            
            if (productsResponse.ok) {
                console.log('Admin access verified - can access products');
                const products = await productsResponse.json();
                console.log(`Found ${products.length} products`);
            } else {
                const errorData = await productsResponse.json();
                console.log('Products access failed:', errorData.message);
            }
            
        } else {
            const errorData = await loginResponse.json();
            console.log('Login failed:', errorData.message);
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the test
testAdminLogin();
