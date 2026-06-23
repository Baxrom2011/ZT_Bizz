const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'boss', 'worker'],
        required: true
    },
    login: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    pass: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('pass')) return next();
    const salt = await bcrypt.genSalt(10);
    this.pass = await bcrypt.hash(this.pass, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.pass);
};

// Remove password from response
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.pass;
    delete obj.__v;
    return obj;
};

module.exports = mongoose.model('User', userSchema);