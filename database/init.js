import db from './db.js';

export async function initDatabase() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS banners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                image VARCHAR(255) NOT NULL
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(100) DEFAULT 'Ulasan',
                image VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                period VARCHAR(100),
                description TEXT,
                image VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                category VARCHAR(50) NOT NULL,
                sub_category VARCHAR(50) DEFAULT 'beverages',
                price INT NOT NULL,
                original_price INT NULL,
                myyogya_price INT NULL,
                promo_end VARCHAR(100) NULL,
                description TEXT,
                image VARCHAR(255) DEFAULT 'default.jpg',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // CEK & TAMBAH KOLOM JIKA BELUM ADA
        const [colOrig] = await db.query("SHOW COLUMNS FROM products LIKE 'original_price'");
        if (colOrig.length === 0) {
            await db.query("ALTER TABLE products ADD COLUMN original_price INT NULL AFTER price");
        }

        const [colMyYogya] = await db.query("SHOW COLUMNS FROM products LIKE 'myyogya_price'");
        if (colMyYogya.length === 0) {
            await db.query("ALTER TABLE products ADD COLUMN myyogya_price INT NULL AFTER original_price");
        }

        const [colPromoEnd] = await db.query("SHOW COLUMNS FROM products LIKE 'promo_end'");
        if (colPromoEnd.length === 0) {
            await db.query("ALTER TABLE products ADD COLUMN promo_end VARCHAR(100) NULL AFTER myyogya_price");
        }

        console.log('✅ Inisialisasi struktur database berhasil');
    } catch (err) {
        console.error('❌ Error inisialisasi database:', err);
    }
}