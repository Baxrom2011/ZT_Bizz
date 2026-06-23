const Chat = require('../models/Chat');

exports.getChatMessages = async (req, res) => {
    try {
        const messages = await Chat.find({}).sort({ time: 1 });
        res.json({ 
            success: true, 
            messages: messages.map(m => m.toJSON()) 
        });
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.addChatMessage = async (req, res) => {
    try {
        const { sender, text, time } = req.body;
        const newMessage = new Chat({ sender, text, time });
        await newMessage.save();
        res.json({ 
            success: true, 
            message: newMessage.toJSON() 
        });
    } catch (error) {
        console.error('Add chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.deleteChatMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await Chat.findOneAndDelete({ _id: id });
        if (!message) {
            return res.status(404).json({ 
                success: false, 
                message: 'Message not found' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Message deleted' 
        });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

exports.clearChat = async (req, res) => {
    try {
        await Chat.deleteMany({});
        res.json({ 
            success: true, 
            message: 'Chat cleared' 
        });
    } catch (error) {
        console.error('Clear chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};