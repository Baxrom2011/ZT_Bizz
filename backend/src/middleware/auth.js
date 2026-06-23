const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('No authorization header');
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log('No token in authorization header');
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        // Verify token
        const secret = process.env.JWT_SECRET || 'default_secret_key';
        const decoded = jwt.verify(token, secret);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token: ' + error.message 
        });
    }
};