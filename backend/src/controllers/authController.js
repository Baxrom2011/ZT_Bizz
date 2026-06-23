const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
    try {
        const { login, pass } = req.body;
        
        // Find user by login
        const user = await User.findOne({ login });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Login yoki parol xato!' 
            });
        }

        // Check password
        const isMatch = await user.comparePassword(pass);
        if (!isMatch) {
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
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove password from response
        const userObj = user.toObject();
        delete userObj.pass;

        res.json({
            success: true,
            token,
            user: userObj
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { id, name, role, login, pass } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ login }, { id }] });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Bunday login yoki ID mavjud!' 
            });
        }

        const user = new User({ id, name, role, login, pass });
        await user.save();

        const userObj = user.toObject();
        delete userObj.pass;

        res.json({
            success: true,
            user: userObj
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        const usersWithoutPass = users.map(user => {
            const obj = user.toObject();
            delete obj.pass;
            return obj;
        });
        res.json({ success: true, users: usersWithoutPass });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        if (updates.pass) {
            const salt = await bcrypt.genSalt(10);
            updates.pass = await bcrypt.hash(updates.pass, salt);
        }

        const user = await User.findOneAndUpdate(
            { id },
            updates,
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userObj = user.toObject();
        delete userObj.pass;

        res.json({ success: true, user: userObj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};