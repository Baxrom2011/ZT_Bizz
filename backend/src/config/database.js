const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        
        // Create indexes
        await createIndexes();
        
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        // Don't exit in production, retry
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

const createIndexes = async () => {
    try {
        // Users collection indexes
        await mongoose.connection.collection('users').createIndex({ login: 1 }, { unique: true });
        await mongoose.connection.collection('users').createIndex({ id: 1 }, { unique: true });
        
        // Records collection indexes
        await mongoose.connection.collection('records').createIndex({ id: 1 }, { unique: true });
        await mongoose.connection.collection('records').createIndex({ date: 1 });
        await mongoose.connection.collection('records').createIndex({ userId: 1 });
        
        // Chat collection indexes
        await mongoose.connection.collection('chats').createIndex({ time: 1 });
        
        console.log('✅ Indexes created');
    } catch (error) {
        console.log('⚠️ Indexes creation skipped:', error.message);
    }
};

module.exports = connectDB;