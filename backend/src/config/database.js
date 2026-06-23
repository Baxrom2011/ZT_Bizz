const mongoose = require('mongoose');
const User = require('../models/User');

// Глобальное состояние
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;
let keepAliveInterval = null;

const connectDB = async () => {
    // Предотвращаем множественные подключения
    if (isConnecting) {
        console.log('⏳ Connection already in progress...');
        return mongoose.connection;
    }

    // Проверяем текущее состояние
    if (mongoose.connection.readyState === 1) {
        console.log('✅ Already connected to MongoDB');
        return mongoose.connection;
    }

    try {
        isConnecting = true;
        connectionAttempts++;
        
        console.log(`🔄 Connecting to MongoDB (attempt ${connectionAttempts})...`);
        
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 60000,
            maxPoolSize: 200,
            minPoolSize: 20,
            maxIdleTimeMS: 60000,
            retryWrites: true,
            retryReads: true,
            autoIndex: true,
            keepAlive: true,
            keepAliveInitialDelay: 300000,
            connectTimeoutMS: 30000,
            heartbeatFrequencyMS: 10000,
        });
        
        isConnecting = false;
        connectionAttempts = 0;
        
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        console.log(`📊 Connection pool size: ${conn.connection.options.maxPoolSize}`);
        console.log(`📊 Connection state: ${mongoose.connection.readyState}`);
        
        // Настройка обработчиков
        setupConnectionHandlers();
        
        // Инициализация БД
        await initDatabase();
        
        // Запуск keep-alive
        startKeepAlive();
        
        return conn;
    } catch (error) {
        isConnecting = false;
        console.error(`❌ MongoDB connection error: ${error.message}`);
        
        if (connectionAttempts < MAX_RETRIES) {
            const delay = Math.min(5000 * connectionAttempts, 30000);
            console.log(`🔄 Retrying in ${delay/1000} seconds... (${connectionAttempts}/${MAX_RETRIES})`);
            
            return new Promise((resolve) => {
                setTimeout(async () => {
                    resolve(await connectDB());
                }, delay);
            });
        } else {
            console.error(`❌ Failed to connect after ${MAX_RETRIES} attempts`);
            throw error;
        }
    }
};

function setupConnectionHandlers() {
    mongoose.connection.removeAllListeners();
    
    mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB re-connected successfully');
        isConnecting = false;
        connectionAttempts = 0;
    });
    
    mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected!');
    });
    
    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB error:', err.message);
    });
    
    mongoose.connection.on('reconnectFailed', () => {
        console.error('❌ MongoDB reconnect failed');
        setTimeout(() => {
            if (mongoose.connection.readyState === 0 && !isConnecting) {
                connectDB().catch(() => {});
            }
        }, 10000);
    });
}

function startKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    
    keepAliveInterval = setInterval(async () => {
        try {
            const state = mongoose.connection.readyState;
            
            if (state === 1) {
                await mongoose.connection.db.admin().ping();
                console.log('✅ MongoDB ping successful');
            } else if (state === 0 && !isConnecting) {
                console.log('⚠️ MongoDB disconnected, reconnecting...');
                await connectDB();
            }
        } catch (error) {
            console.error('⚠️ MongoDB keep-alive error:', error.message);
        }
    }, 30000);
}

const initDatabase = async () => {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            console.log('⚠️ Database not ready, skipping init');
            return;
        }
        
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Создание индексов
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
        
        // ✅ ИСПРАВЛЕНО: Создание пользователей с хешированием через модель
        const defaultUsers = [
            { id: 'admin', name: 'Admin', role: 'admin', login: 'admin', pass: '123' },
            { id: 'boss1', name: 'Boshliq Alisher', role: 'boss', login: 'boss', pass: '123' },
            { id: 'worker1', name: 'Ishchi Vali', role: 'worker', login: 'worker', pass: '123' }
        ];
        
        for (const userData of defaultUsers) {
            try {
                const existing = await User.findOne({ login: userData.login });
                if (!existing) {
                    // ✅ Используем модель User, которая автоматически хеширует пароль
                    const user = new User({
                        id: userData.id,
                        name: userData.name,
                        role: userData.role,
                        login: userData.login,
                        pass: userData.pass
                    });
                    await user.save();
                    console.log(`✅ Default user created: ${userData.login}`);
                } else {
                    console.log(`ℹ️ User ${userData.login} already exists`);
                }
            } catch (err) {
                console.log(`⚠️ Error creating user ${userData.login}:`, err.message);
            }
        }
        
        console.log('✅ Database initialization complete');
    } catch (error) {
        console.log('⚠️ Database init error:', error.message);
    }
};

// Обработка завершения
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down...');
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
    }
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});

module.exports = {
    connectDB,
    getConnection: () => mongoose.connection,
    isConnected: () => mongoose.connection.readyState === 1,
    closeConnection: async () => {
        if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
        }
        await mongoose.connection.close();
    }
};