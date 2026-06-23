const User = require('../models/User');
const Record = require('../models/Record');
const Chat = require('../models/Chat');

// Get all data
exports.getAllData = async (req, res) => {
    try {
        const users = await User.find({});
        const records = await Record.find({});
        const chat = await Chat.find({}).sort({ time: 1 });

        // Remove passwords from response
        const usersWithoutPass = users.map(user => {
            const userObj = user.toObject();
            delete userObj.pass;
            return userObj;
        });

        res.json({
            users: usersWithoutPass,
            records,
            chat
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Save all data (sync)
exports.saveAllData = async (req, res) => {
    try {
        const { users, records, chat } = req.body;

        // Sync users
        if (users && Array.isArray(users)) {
            for (const userData of users) {
                const existingUser = await User.findOne({ id: userData.id });
                if (existingUser) {
                    // Update existing user
                    if (userData.pass && userData.pass.length < 60) {
                        // Password is plain text, hash it
                        const bcrypt = require('bcryptjs');
                        const salt = await bcrypt.genSalt(10);
                        userData.pass = await bcrypt.hash(userData.pass, salt);
                    }
                    await User.findOneAndUpdate({ id: userData.id }, userData, { new: true });
                } else {
                    // Create new user
                    const newUser = new User(userData);
                    await newUser.save();
                }
            }
        }

        // Sync records
        if (records && Array.isArray(records)) {
            for (const recordData of records) {
                await Record.findOneAndUpdate(
                    { id: recordData.id },
                    recordData,
                    { upsert: true, new: true }
                );
            }
        }

        // Sync chat
        if (chat && Array.isArray(chat)) {
            await Chat.deleteMany({});
            for (const chatData of chat) {
                const newChat = new Chat(chatData);
                await newChat.save();
            }
        }

        res.json({ success: true, message: 'Data synced successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get records by date
exports.getRecordsByDate = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }
        const records = await Record.find({ date });
        res.json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get month stats
exports.getMonthStats = async (req, res) => {
    try {
        const { month } = req.query;
        const records = await Record.find({ 
            date: { $regex: `^${month}` },
            status: 'approved'
        });
        
        let income = 0, expense = 0;
        records.forEach(r => {
            if (r.type === 'income') income += r.amount;
            else expense += r.amount;
        });
        
        res.json({
            success: true,
            stats: {
                income,
                expense,
                profit: income - expense
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create new record
exports.createRecord = async (req, res) => {
    try {
        const recordData = req.body;
        const newRecord = new Record(recordData);
        await newRecord.save();
        res.json({ success: true, record: newRecord });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update record
exports.updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const record = await Record.findOneAndUpdate(
            { id },
            updates,
            { new: true }
        );
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        res.json({ success: true, record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete record
exports.deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await Record.findOneAndDelete({ id });
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        res.json({ success: true, message: 'Record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get chat messages
exports.getChatMessages = async (req, res) => {
    try {
        const messages = await Chat.find({}).sort({ time: 1 });
        res.json({ success: true, messages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add chat message
exports.addChatMessage = async (req, res) => {
    try {
        const { sender, text, time } = req.body;
        const newMessage = new Chat({ sender, text, time });
        await newMessage.save();
        res.json({ success: true, message: newMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};