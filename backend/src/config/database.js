const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 2,
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        
        // Create indexes and init users
        await initDatabase();
        
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

const initDatabase = async () => {
    try {
        // Create indexes
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        if (collectionNames.includes('users')) {
            await mongoose.connection.collection('users').createIndex({ login: 1 }, { unique: true });
            await mongoose.connection.collection('users').createIndex({ id: 1 }, { unique: true });
            console.log('✅ Users indexes created');
        }
        
        if (collectionNames.includes('records')) {
            await mongoose.connection.collection('records').createIndex({ id: 1 }, { unique: true });
            await mongoose.connection.collection('records').createIndex({ date: 1 });
            await mongoose.connection.collection('records').createIndex({ userId: 1 });
            console.log('✅ Records indexes created');
        }
        
        if (collectionNames.includes('chats')) {
            await mongoose.connection.collection('chats').createIndex({ time: 1 });
            console.log('✅ Chat indexes created');
        }
        
        // Create default users if not exists
        const defaultUsers = [
            { id: 'admin', name: 'Admin', role: 'admin', login: 'admin', pass: '123' },
            { id: 'boss1', name: 'Boshliq Alisher', role: 'boss', login: 'boss', pass: '123' },
            { id: 'worker1', name: 'Ishchi Vali', role: 'worker', login: 'worker', pass: '123' }
        ];
        
        for (const userData of defaultUsers) {
            const existing = await User.findOne({ login: userData.login });
            if (!existing) {
                const user = new User(userData);
                await user.save();
                console.log(`✅ Default user created: ${userData.login}`);
            } else {
                console.log(`✅ User already exists: ${userData.login}`);
            }
        }
        
    } catch (error) {
        console.log('⚠️ Database init error:', error.message);
    }
};

// To'g'ri eksport qilish
module.exports = connectDB;