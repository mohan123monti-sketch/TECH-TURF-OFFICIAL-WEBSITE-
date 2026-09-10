const defaultApiBase = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.protocol.startsWith('file'))
    ? `${window.location.origin}/api`
    : (typeof window !== 'undefined' && window.location.port === '5001' ? 'http://localhost:5001/api' : 'http://localhost:5000/api');

const API_BASE = (typeof window !== 'undefined' && window.API_BASE_URL)
    ? window.API_BASE_URL
    : defaultApiBase;

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
