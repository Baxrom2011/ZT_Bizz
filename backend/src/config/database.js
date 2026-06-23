const mongoose = require('mongoose');
const User = require('../models/User');

let retryCount = 0;
const MAX_RETRIES = 10;

const connectDB = async () => {
    try {
        console.log(`🔄 Connecting to MongoDB (attempt ${retryCount + 1})...`);
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 60000,
            socketTimeoutMS: 60000,
            connectTimeoutMS: 60000,
            maxPoolSize: 50,
            minPoolSize: 5,
            retryWrites: true,
            retryReads: true,
            // keepAlive O'CHIRILDI - MongoDB 6.x da qo'llab-quvvatlanmaydi
            // family: 4, // Bu ham ba'zi versiyalarda muammo berishi mumkin
        });
        
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        console.log(`📊 Connection pool size: ${conn.connection.options.maxPoolSize}`);
        retryCount = 0; // Muvaffaqiyatli ulanganda retry ni nolga qaytaramiz
        
        await initDatabase();
        
        // MongoDB ulanish hodisalarini kuzatish
        mongoose.connection.on('connected', () => {
            console.log('✅ MongoDB re-connected successfully');
            retryCount = 0;
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected! Reconnecting...');
            retryCount = 0;
            setTimeout(() => {
                connectDB();
            }, 2000);
        });
        
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err.message);
            if (err.message.includes('keepAlive')) {
                console.log('⚠️ Ignoring keepAlive error, continuing...');
                return;
            }
            setTimeout(() => {
                console.log('🔄 Reconnecting to MongoDB...');
                connectDB();
            }, 3000);
        });
        
        return conn;
    } catch (error) {
        retryCount++;
        console.error(`❌ MongoDB connection error: ${error.message}`);
        
        // keepAlive xatosi bo'lsa, maxsus ishlov beramiz
        if (error.message && error.message.includes('keepalive')) {
            console.log('⚠️ keepAlive not supported, retrying without it...');
            // keepAlive ni olib tashlab qayta urinish
            try {
                const conn = await mongoose.connect(process.env.MONGODB_URI, {
                    serverSelectionTimeoutMS: 60000,
                    socketTimeoutMS: 60000,
                    connectTimeoutMS: 60000,
                    maxPoolSize: 50,
                    minPoolSize: 5,
                    retryWrites: true,
                    retryReads: true,
                });
                console.log('✅ MongoDB connected without keepAlive');
                retryCount = 0;
                await initDatabase();
                return conn;
            } catch (innerError) {
                console.error('❌ Retry failed:', innerError.message);
            }
        }
        
        if (retryCount < MAX_RETRIES) {
            const delay = Math.min(5000 * retryCount, 30000);
            console.log(`🔄 Retrying connection in ${delay/1000} seconds... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => {
                connectDB();
            }, delay);
        } else {
            console.error(`❌ Failed to connect after ${MAX_RETRIES} attempts`);
            if (process.env.NODE_ENV !== 'production') {
                process.exit(1);
            }
        }
    }
};

const initDatabase = async () => {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            console.log('⚠️ Database not ready, skipping init');
            return;
        }
        
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Indexes yaratish
        if (collectionNames.includes('users')) {
            try {
                await mongoose.connection.collection('users').createIndex(
                    { login: 1 }, 
                    { unique: true, background: true }
                );
                await mongoose.connection.collection('users').createIndex(
                    { id: 1 }, 
                    { unique: true, background: true }
                );
                console.log('✅ Users indexes ready');
            } catch (err) {
                console.log('⚠️ Users indexes error:', err.message);
            }
        }
        
        if (collectionNames.includes('records')) {
            try {
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
                console.log('✅ Records indexes ready');
            } catch (err) {
                console.log('⚠️ Records indexes error:', err.message);
            }
        }
        
        if (collectionNames.includes('chats')) {
            try {
                await mongoose.connection.collection('chats').createIndex(
                    { time: 1 }, 
                    { background: true }
                );
                console.log('✅ Chat indexes ready');
            } catch (err) {
                console.log('⚠️ Chat indexes error:', err.message);
            }
        }
        
        // Default users
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
                } else {
                    console.log(`✅ User already exists: ${userData.login}`);
                }
            } catch (err) {
                console.log(`⚠️ User ${userData.login} error:`, err.message);
            }
        }
        
        console.log('✅ Database initialization complete');
        
    } catch (error) {
        console.log('⚠️ Database init error:', error.message);
    }
};

// Keep-alive - har 3 daqiqada ping (MongoDB 6.x da ishlaydi)
const keepAlive = () => {
    setInterval(async () => {
        try {
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.db.admin().ping();
                console.log('✅ MongoDB ping successful');
            } else {
                console.log('⚠️ MongoDB not connected, reconnecting...');
                retryCount = 0;
                await connectDB();
            }
        } catch (error) {
            if (error.message && error.message.includes('keepalive')) {
                // keepAlive xatosini ignore qilamiz
                return;
            }
            console.log('⚠️ MongoDB ping failed:', error.message);
            retryCount = 0;
            await connectDB();
        }
    }, 180000); // 3 daqiqa
};

setTimeout(keepAlive, 5000);

module.exports = connectDB;