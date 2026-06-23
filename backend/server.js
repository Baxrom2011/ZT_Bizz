const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Load env vars
dotenv.config();

// Import database connection
const connectDB = require('./src/config/database');

// Connect to database
connectDB();

const app = express();

// ============================================================
//  SECURITY & MIDDLEWARE
// ============================================================

// Rate limiting - API uchun
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 daqiqa
    max: 300, // 300 ta so'rov
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// CSP sozlamalari - CDN larga ruxsat
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com",
                "https://*.render.com"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],
            styleSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "wss:", "ws:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
            workerSrc: ["'self'", "blob:"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: []
        }
    }
}));

// Compression
app.use(compression());

// CORS - to'liq ruxsat
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// JSON parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// ============================================================
//  STATIC FILES (Frontend)
// ============================================================

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
}));

// ============================================================
//  API ROUTES
// ============================================================

// Auth routes
app.use('/api/auth', require('./src/routes/authRoutes'));

// Data routes
app.use('/api/data', require('./src/routes/dataRoutes'));

// Chat routes
app.use('/api/chat', require('./src/routes/chatRoutes'));

// ============================================================
//  HEALTH CHECK
// ============================================================

// Health check with database status
app.get('/api/ping', async (req, res) => {
    const statusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    let dbStatus = 'unknown';
    let dbDetails = {};
    
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            dbStatus = 'connected';
            dbDetails = {
                host: mongoose.connection.host,
                name: mongoose.connection.name,
                poolSize: mongoose.connection.options.maxPoolSize,
                connections: mongoose.connection.connections?.length || 0
            };
        } else {
            dbStatus = statusMap[mongoose.connection.readyState] || 'unknown';
        }
    } catch (error) {
        dbStatus = 'error';
        dbDetails = { error: error.message };
    }
    
    res.json({ 
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        mongodb: {
            status: dbStatus,
            ...dbDetails
        },
        environment: process.env.NODE_ENV || 'development'
    });
});

// Detailed health check
app.get('/api/health', async (req, res) => {
    const statusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    let dbStatus = 'unknown';
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            dbStatus = 'connected';
        } else {
            dbStatus = statusMap[mongoose.connection.readyState] || 'unknown';
        }
    } catch (error) {
        dbStatus = 'error';
    }
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            api: 'running',
            database: dbStatus,
            static: 'running'
        },
        uptime: {
            seconds: Math.floor(process.uptime()),
            formatted: formatUptime(process.uptime())
        },
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        }
    });
});

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// ============================================================
//  FRONTEND ROUTES
// ============================================================

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================
//  ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }
    
    // Mongoose duplicate key error
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry',
            field: Object.keys(err.keyPattern)[0]
        });
    }
    
    // JWT error
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================================
//  SERVER START
// ============================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️ Connecting...'}`);
    console.log('='.repeat(50));
    console.log('\n📋 Available routes:');
    console.log(`  GET  /api/ping     - Health check`);
    console.log(`  GET  /api/health   - Detailed health check`);
    console.log(`  POST /api/auth/login  - Login`);
    console.log(`  POST /api/auth/register - Register`);
    console.log(`  GET  /api/data/all  - Get all data`);
    console.log(`  GET  /api/chat     - Get chat messages`);
    console.log(`  POST /api/chat     - Send chat message`);
    console.log(`  *    /             - Frontend`);
    console.log('='.repeat(50));
});

// ============================================================
//  GRACEFUL SHUTDOWN
// ============================================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    // Don't exit in production, just log
    if (process.env.NODE_ENV === 'development') {
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    // Don't exit in production, just log
    if (process.env.NODE_ENV === 'development') {
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    process.exit(0);
});