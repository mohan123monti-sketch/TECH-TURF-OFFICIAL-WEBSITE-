import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const NEXUS_API_KEY = process.env.NEXUS_AI_API_KEY || '';

const decodeBearerToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        return true;
    }
    return false;
};

export const protect = (req, res, next) => {
    try {
        if (decodeBearerToken(req)) {
            return next();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed.' });
    }

    return res.status(401).json({ message: 'Not authorized, no token.' });
};

export const optionalAuth = (req, res, next) => {
    try {
        decodeBearerToken(req);
    } catch (error) {
        console.error('Optional auth decode error:', error);
    }
    next();
};

export const protectOrApiKey = (req, res, next) => {
    try {
        if (decodeBearerToken(req)) {
            return next();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(401).json({ message: 'Not authorized, token failed.' });
    }

    const apiKey = req.headers['x-api-key'];
    if (NEXUS_API_KEY && apiKey === NEXUS_API_KEY) {
        req.user = { id: 1, role: 'service' };
        return next();
    }

    return res.status(401).json({ message: 'Not authorized, no valid token or API key.' });
};

export const singleTenantFallback = (req, res, next) => {
    try {
        decodeBearerToken(req);
    } catch (error) {
        console.error('Fallback auth decode error:', error);
    }

    if (!req.user) {
        req.user = { id: 1, role: 'user' };
    }

    next();
};

export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as admin.' });
    }
};
