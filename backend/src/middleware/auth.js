const jwt = require('jsonwebtoken');

exports.auth = (req, res, next) => {
    try {
        console.log('🔐 Auth middleware');
        console.log('📋 Headers:', req.headers);
        
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('❌ No authorization header');
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            console.log('❌ Invalid authorization format');
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token format' 
            });
        }

        const token = parts[1];
        if (!token) {
            console.log('❌ No token in authorization header');
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided' 
            });
        }

        console.log('🎫 Token received:', token.substring(0, 20) + '...');

        // Verify token
        const secret = process.env.JWT_SECRET || 'default_secret_key';
        console.log('🔐 Using JWT secret:', secret.substring(0, 10) + '...');
        
        try {
            const decoded = jwt.verify(token, secret);
            console.log('✅ Token verified for user:', decoded.login);
            req.user = decoded;
            next();
        } catch (jwtError) {
            console.log('❌ JWT verification failed:', jwtError.message);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token: ' + jwtError.message 
            });
        }
    } catch (error) {
        console.error('❌ Auth error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};