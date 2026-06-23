const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    time: {
        type: Number,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Chat', chatSchema);