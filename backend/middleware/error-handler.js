import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);

    // If it's an API route, send JSON
    if (req.originalUrl && req.originalUrl.startsWith('/api/')) {
        return res.json({
            message: err.message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack
        });
    }

    // Otherwise serve custom error pages
    if (statusCode === 404) {
        return res.sendFile(path.resolve(__dirname, '../../frontend/pages/404.html'));
    }
    
    return res.sendFile(path.resolve(__dirname, '../../frontend/pages/500.html'));
};

export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};
