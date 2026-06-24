const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Login
exports.login = async (req, res) => {
    try {
        console.log('📥 Login request received');
        console.log('📝 Request body:', req.body);
        
        const { login, pass } = req.body;
        
        if (!login || !pass) {
            console.log('❌ Missing login or password');
            return res.status(400).json({ 
                success: false, 
                message: 'Login va parol kerak!' 
            });
        }
        
        console.log('🔍 Finding user:', login);
        
        // Find user by login
        const user = await User.findOne({ login: login });
        if (!user) {
            console.log('❌ User not found:', login);
            return res.status(401).json({ 
                success: false, 
                message: 'Login yoki parol xato!' 
            });
        }

        console.log('✅ User found:', user.name);
        console.log('🔑 Checking password...');
        
        // Check password
        const isMatch = await user.comparePassword(pass);
        if (!isMatch) {
            console.log('❌ Password incorrect for:', login);
            return res.status(401).json({ 
                success: false, 
                message: 'Login yoki parol xato!' 
            });
        }

        console.log('✅ Password correct');
        
        // Generate JWT token
        const secret = process.env.JWT_SECRET || 'default_secret_key';
        console.log('🔐 Using JWT secret:', secret.substring(0, 10) + '...');
        
        const token = jwt.sign(
            { 
                id: user.id, 
                name: user.name, 
                role: user.role,
                login: user.login 
            },
            secret,
            { expiresIn: '7d' }
        );

        console.log('✅ Login successful for:', login);
        console.log('🎫 Token generated:', token.substring(0, 20) + '...');
        
        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                login: user.login
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Server error' 
        });
    }
};

// Register (for creating initial users)
exports.register = async (req, res) => {
    try {
        console.log('📥 Register request received');
        console.log('📝 Request body:', req.body);
        
        const { id, name, role, login, pass } = req.body;
        
        if (!login || !pass || !name) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                success: false, 
                message: 'Barcha maydonlarni to\'ldiring!' 
            });
        }
        
        if (pass.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Parol kamida 6 belgi bo\'lishi kerak!'
            });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ login: login }, { id: id }] 
        });
        
        if (existingUser) {
            console.log('❌ User already exists:', login);
            return res.status(400).json({ 
                success: false, 
                message: 'Bunday login yoki ID mavjud!' 
            });
        }

        const user = new User({ 
            id: id || 'user_' + Date.now(), 
            name, 
            role: role || 'worker', 
            login, 
            pass 
        });
        
        await user.save();
        console.log('✅ User created:', login);

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                login: user.login
            }
        });
    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get all users (with auth)
exports.getUsers = async (req, res) => {
    try {
        console.log('📥 Get users request');
        const users = await User.find({});
        res.json({ 
            success: true, 
            users: users.map(u => ({
                id: u.id,
                name: u.name,
                role: u.role,
                login: u.login
            }))
        });
    } catch (error) {
        console.error('❌ Get users error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log('📥 Update user:', id);
        console.log('📝 Updates:', updates);
        
        if (updates.pass) {
            if (updates.pass.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Parol kamida 6 belgi bo\'lishi kerak!'
                });
            }
            const salt = await bcrypt.genSalt(10);
            updates.pass = await bcrypt.hash(updates.pass, salt);
        }

        const user = await User.findOneAndUpdate(
            { id: id },
            updates,
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                login: user.login
            }
        });
    } catch (error) {
        console.error('❌ Update user error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('📥 Delete user:', id);
        
        if (id === 'admin') {
            return res.status(400).json({ 
                success: false, 
                message: 'Adminni o\'chirib bo\'lmaydi!' 
            });
        }
        
        const user = await User.findOneAndDelete({ id: id });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'User deleted successfully' 
        });
    } catch (error) {
        console.error('❌ Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};