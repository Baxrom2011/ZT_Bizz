const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Login
exports.login = async (req, res) => {
    try {
        const { login, pass } = req.body;
        
        console.log('Login attempt:', login);
        
        // Find user by login
        const user = await User.findOne({ login });
        if (!user) {
            console.log('User not found:', login);
            return res.status(401).json({ 
                success: false, 
                message: 'Login yoki parol xato!' 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(pass);
        if (!isMatch) {
            console.log('Password incorrect for:', login);
            return res.status(401).json({ 
                success: false, 
                message: 'Login yoki parol xato!' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                name: user.name, 
                role: user.role,
                login: user.login 
            },
            process.env.JWT_SECRET || 'default_secret_key',
            { expiresIn: '7d' }
        );

        console.log('Login successful:', login);
        
        res.json({
            success: true,
            token: token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Server error' 
        });
    }
};

// Register
exports.register = async (req, res) => {
    try {
        const { id, name, role, login, pass } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ 
            $or: [{ login }, { id }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Bunday login yoki ID mavjud!' 
            });
        }

        const user = new User({ id, name, role, login, pass });
        await user.save();

        res.json({
            success: true,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ 
            success: true, 
            users: users.map(u => u.toJSON()) 
        });
    } catch (error) {
        console.error('Get users error:', error);
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
        
        if (updates.pass) {
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
            user: user.toJSON() 
        });
    } catch (error) {
        console.error('Update user error:', error);
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
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};