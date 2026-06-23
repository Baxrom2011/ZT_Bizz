const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.auth = async (req, res, next) => {
    try {
        console.log('🔐 Auth middleware');
        
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

        console.log('🎫 Token received:', token.substring(0, 30) + '...');

        const secret = process.env.JWT_SECRET || 'default_secret_key_change_this';
        
        try {
            const decoded = jwt.verify(token, secret);
            console.log('✅ Token verified for user:', decoded.login);
            console.log('👤 User ID from token:', decoded.id);
            
            // ✅ Проверяем, что пользователь существует в БД
            const user = await User.findOne({ id: decoded.id });
            if (!user) {
                console.log('❌ User not found in database:', decoded.id);
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }
            
            req.user = decoded;
            req.userId = decoded.id;
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