const User = require('../models/User');
const Record = require('../models/Record');
const Chat = require('../models/Chat');

// Get all data
exports.getAllData = async (req, res) => {
    try {
        const users = await User.find({});
        const records = await Record.find({});
        const chat = await Chat.find({}).sort({ time: 1 });

        res.json({
            success: true,
            users: users.map(u => u.toJSON()),
            records: records.map(r => r.toJSON()),
            chat: chat.map(c => c.toJSON())
        });
    } catch (error) {
        console.error('Get all data error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Save all data (sync)
exports.saveAllData = async (req, res) => {
    try {
        const { users, records, chat } = req.body;

        // Sync users
        if (users && Array.isArray(users)) {
            for (const userData of users) {
                await User.findOneAndUpdate(
                    { id: userData.id },
                    userData,
                    { upsert: true, new: true }
                );
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

        res.json({ 
            success: true, 
            message: 'Data synced successfully' 
        });
    } catch (error) {
        console.error('Sync data error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get records by date
exports.getRecordsByDate = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Date is required' 
            });
        }
        const records = await Record.find({ date: date });
        res.json({ 
            success: true, 
            records: records.map(r => r.toJSON()) 
        });
    } catch (error) {
        console.error('Get records error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get month stats
exports.getMonthStats = async (req, res) => {
    try {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({ 
                success: false, 
                message: 'Month is required' 
            });
        }
        
        const records = await Record.find({ 
            date: { $regex: '^' + month },
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
                income: income,
                expense: expense,
                profit: income - expense
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Create new record
exports.createRecord = async (req, res) => {
    try {
        const recordData = req.body;
        const newRecord = new Record(recordData);
        await newRecord.save();
        res.json({ 
            success: true, 
            record: newRecord.toJSON() 
        });
    } catch (error) {
        console.error('Create record error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Update record
exports.updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const record = await Record.findOneAndUpdate(
            { id: id },
            updates,
            { new: true }
        );
        if (!record) {
            return res.status(404).json({ 
                success: false, 
                message: 'Record not found' 
            });
        }
        res.json({ 
            success: true, 
            record: record.toJSON() 
        });
    } catch (error) {
        console.error('Update record error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Delete record
exports.deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await Record.findOneAndDelete({ id: id });
        if (!record) {
            return res.status(404).json({ 
                success: false, 
                message: 'Record not found' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Record deleted' 
        });
    } catch (error) {
        console.error('Delete record error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};