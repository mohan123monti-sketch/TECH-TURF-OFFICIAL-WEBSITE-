import apiRequest from '../core/api.js';

export const createOrder = async (orderData) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    return await apiRequest('/orders', 'POST', orderData, userInfo.token);
};

export const getMyOrders = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const token = (userInfo && userInfo.token) || localStorage.getItem('tt_token');
    return await apiRequest('/orders/myorders', 'GET', null, token);
};

export const getOrderDetails = async (id) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const token = (userInfo && userInfo.token) || localStorage.getItem('tt_token');
    return await apiRequest(`/orders/${id}`, 'GET', null, token);
};
