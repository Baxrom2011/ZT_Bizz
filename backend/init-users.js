// backend/init-users.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

async function initUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
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
                console.log(`✅ Created user: ${userData.login}`);
            } else {
                // Update password if needed
                const salt = await bcrypt.genSalt(10);
                const hashedPass = await bcrypt.hash(userData.pass, salt);
                await User.findOneAndUpdate(
                    { login: userData.login },
                    { pass: hashedPass }
                );
                console.log(`✅ Updated user: ${userData.login}`);
            }
        }
        
        console.log('✅ All users initialized');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

initUsers();