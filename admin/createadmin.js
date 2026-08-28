import 'dotenv/config';
import db from '../database/db.js';
import bcrypt from 'bcrypt';

// Ambil username & password dari .env (aman, tidak akan terlihat di GitHub)
const username = process.env.ADMIN_USERNAME || 'RedHat66';
const password = process.env.ADMIN_PASSWORD || '001933001928';

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO admins (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = ?',
            [username, hashedPassword, hashedPassword]
        );
        console.log(`✅ Admin "${username}" berhasil dibuat / diperbarui!`);
    } catch (error) {
        console.error('❌ Gagal membuat admin:', error);
    } finally {
        await db.end();
        process.exit();
    }
}

createAdmin();