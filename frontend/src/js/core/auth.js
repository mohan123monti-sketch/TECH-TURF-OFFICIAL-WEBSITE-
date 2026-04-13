import apiRequest from './api.js';

export const login = async (email, password) => {
    const data = await apiRequest('/auth/login', 'POST', { email, password });

    // If backend requires 2FA, don't set session yet but return the data for UI handling
    if (data.twoFactorRequired) {
        return data;
    }

    localStorage.setItem('userInfo', JSON.stringify(data));
    localStorage.setItem('tt_token', data.token);
    if (data.user) {
        localStorage.setItem('tt_user', JSON.stringify(data.user));
    }
    return data;
};

export const verifyTwoStep = async (email, otp = null, backupCode = null) => {
    const payload = { email };
    if (otp) payload.otp = otp;
    if (backupCode) payload.backupCode = backupCode;

    const data = await apiRequest('/auth/otp/verify-2step', 'POST', payload);

    localStorage.setItem('userInfo', JSON.stringify(data));
    localStorage.setItem('tt_token', data.token);
    if (data.user) {
        localStorage.setItem('tt_user', JSON.stringify(data.user));
    }
    return data;
};

export const forgotPassword = async (email) => {
    return await apiRequest('/auth/forgot-password', 'POST', { email });
};

export const resetPassword = async (email, otp, newPassword) => {
    return await apiRequest('/auth/reset-password', 'POST', { email, otp, newPassword });
};

export const register = async (username, email, password) => {
    const data = await apiRequest('/auth/register', 'POST', { username, email, password });
    localStorage.setItem('userInfo', JSON.stringify(data));
    localStorage.setItem('tt_token', data.token);
    if (data.user) {
        localStorage.setItem('tt_user', JSON.stringify(data.user));
    }
    return data;
};

export const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('tt_token');
    window.location.href = '/pages/login.html';
};

export const getProfile = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const token = (userInfo && userInfo.token) || localStorage.getItem('tt_token');
    if (!token) return null;
    return await apiRequest('/users/profile', 'GET', null, token);
};
