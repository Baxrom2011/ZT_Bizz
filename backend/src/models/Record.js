const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    date: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    desc: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    userId: {
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

module.exports = mongoose.model('Record', recordSchema);