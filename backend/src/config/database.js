const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // useNewUrlParser va useUnifiedTopology olib tashlandi (v4.0.0 dan boshlab kerak emas)
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 2,
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        
        // Create indexes
        await createIndexes();
        
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

const createIndexes = async () => {
    try {
        // Check if collections exist before creating indexes
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Users collection indexes
        if (collectionNames.includes('users')) {
            await mongoose.connection.collection('users').createIndex({ login: 1 }, { unique: true });
            await mongoose.connection.collection('users').createIndex({ id: 1 }, { unique: true });
            console.log('✅ Users indexes created');
        }
        
        // Records collection indexes
        if (collectionNames.includes('records')) {
            await mongoose.connection.collection('records').createIndex({ id: 1 }, { unique: true });
            await mongoose.connection.collection('records').createIndex({ date: 1 });
            await mongoose.connection.collection('records').createIndex({ userId: 1 });
            console.log('✅ Records indexes created');
        }
        
        // Chat collection indexes
        if (collectionNames.includes('chats')) {
            await mongoose.connection.collection('chats').createIndex({ time: 1 });
            console.log('✅ Chat indexes created');
        }
    } catch (error) {
        console.log('⚠️ Indexes creation skipped:', error.message);
    }
};

module.exports = connectDB;