const API_BASE = (typeof window !== 'undefined' && window.API_BASE_URL)
    ? window.API_BASE_URL
    : 'http://localhost:5000/api';

const apiRequest = async (endpoint, method = 'GET', body = null, token = null) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        let data = null;

        try {
            data = await response.json();
        } catch (parseError) {
            const text = await response.text();
            data = text ? { message: text } : null;
        }

        if (!response.ok) {
            throw new Error((data && data.message) || 'Something went wrong');
        }
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};

export default apiRequest;
