import apiRequest from '../core/api.js';

export const getAllProducts = async () => {
    return await apiRequest('/products', 'GET');
};

export const getProductDetails = async (id) => {
    return await apiRequest(`/products/${id}`, 'GET');
};

export const createProduct = async (productData) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    return await apiRequest('/products', 'POST', productData, userInfo.token);
};
