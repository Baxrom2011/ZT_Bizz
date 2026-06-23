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

// Remove __v from response
chatSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model('Chat', chatSchema);