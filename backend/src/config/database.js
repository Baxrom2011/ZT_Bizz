const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Cheksiz vaqt kutish
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 0, // 0 = cheksiz
            // Maksimal ulanishlar
            maxPoolSize: 100,
            minPoolSize: 10,
            // Qayta urinish
            retryWrites: true,
            retryReads: true,
            // Har doim qayta ulanish
            autoIndex: true,
            // Keep-alive
            keepAlive: true,
            keepAliveInitialDelay: 300000,
        });
        
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        console.log(`📊 Connection pool size: ${conn.connection.options.maxPoolSize}`);
        
        // Database initializatsiya
        await initDatabase();
        
        // MongoDB ulanish hodisalarini kuzatish
        mongoose.connection.on('connected', () => {
            console.log('✅ MongoDB re-connected successfully');
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected! Reconnecting...');
            setTimeout(() => {
                connectDB();
            }, 1000);
        });
        
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err.message);
            // Xatolikda darhol qayta ulanish
            setTimeout(() => {
                console.log('🔄 Reconnecting to MongoDB...');
                connectDB();
            }, 2000);
        });
        
        // Process tugaganda ulanishni yopish
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
            process.exit(0);
        });
        
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        // Har doim qayta urinish
        console.log('🔄 Retrying connection in 3 seconds...');
        setTimeout(() => {
            connectDB();
        }, 3000);
    }
};

const initDatabase = async () => {
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Indexes yaratish (agar mavjud bo'lmasa)
        if (collectionNames.includes('users')) {
            await mongoose.connection.collection('users').createIndex(
                { login: 1 }, 
                { unique: true, background: true }
            );
            await mongoose.connection.collection('users').createIndex(
                { id: 1 }, 
                { unique: true, background: true }
            );
            console.log('✅ Users indexes ready');
        }
        
        if (collectionNames.includes('records')) {
            await mongoose.connection.collection('records').createIndex(
                { id: 1 }, 
                { unique: true, background: true }
            );
            await mongoose.connection.collection('records').createIndex(
                { date: 1 }, 
                { background: true }
            );
            await mongoose.connection.collection('records').createIndex(
                { userId: 1 }, 
                { background: true }
            );
            await mongoose.connection.collection('records').createIndex(
                { date: 1, userId: 1 }, 
                { background: true }
            );
            console.log('✅ Records indexes ready');
        }
        
        if (collectionNames.includes('chats')) {
            await mongoose.connection.collection('chats').createIndex(
                { time: 1 }, 
                { background: true }
            );
            console.log('✅ Chat indexes ready');
        }
        
        // Default users - har doim mavjudligini tekshirish
        const defaultUsers = [
            { id: 'admin', name: 'Admin', role: 'admin', login: 'admin', pass: '123' },
            { id: 'boss1', name: 'Boshliq Alisher', role: 'boss', login: 'boss', pass: '123' },
            { id: 'worker1', name: 'Ishchi Vali', role: 'worker', login: 'worker', pass: '123' }
        ];
        
        for (const userData of defaultUsers) {
            try {
                const existing = await User.findOne({ login: userData.login });
                if (!existing) {
                    const user = new User(userData);
                    await user.save();
                    console.log(`✅ Default user created: ${userData.login}`);
                }
            } catch (err) {
                // Agar xatolik bo'lsa, davom etish
                console.log(`⚠️ User ${userData.login} exists or error: ${err.message}`);
            }
        }
        
        console.log('✅ Database initialization complete');
        
    } catch (error) {
        console.log('⚠️ Database init error:', error.message);
        // Init xatolik bo'lsa ham davom etish
    }
};

// Har 5 daqiqada MongoDB ga ping yuborish (aloqani saqlab turish)
const keepAlive = () => {
    setInterval(async () => {
        try {
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.db.admin().ping();
                console.log('✅ MongoDB ping successful');
            } else {
                console.log('⚠️ MongoDB not connected, reconnecting...');
                await connectDB();
            }
        } catch (error) {
            console.log('⚠️ MongoDB ping failed:', error.message);
            await connectDB();
        }
    }, 300000); // 5 daqiqa
};

// Keep-alive ni ishga tushirish
setTimeout(keepAlive, 10000);

module.exports = connectDB;