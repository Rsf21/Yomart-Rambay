import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import db from '../database/db.js';
import { login } from '../controllers/authcontrollers.js';

const route = express.Router();

const ADMIN_LOGIN_PATH = process.env.ADMIN_LOGIN_PATH
const ADMIN_DASHBOARD_PATH = process.env.ADMIN_DASHBOARD_PATH
const ADMIN_WA_NUMBER = process.env.ADMIN_WA_NUMBER

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/image';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|webp/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Hanya format gambar (.jpg, .jpeg, .png, .webp) yang diperbolehkan!'));
    }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Terlalu banyak percobaan login yang gagal. Coba lagi dalam 15 menit.',
    standardHeaders: true,
    legacyHeaders: false
});

const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.adminId) {
        return res.redirect(ADMIN_LOGIN_PATH);
    }
    next();
};

const preventCache = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
};

function safeUnlink(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error('Gagal menghapus file lama:', err);
    }
}

route.get('/', async (req, res) => {
    try {
        const currentCategory = req.query.category || 'buming';

        const [products] = await db.query(
            'SELECT * FROM products WHERE category = ? ORDER BY id DESC',
            [currentCategory]
        );

        const [bannerRows] = await db.query('SELECT * FROM banners');
        const banners = {};
        bannerRows.forEach(b => {
            banners[b.name] = b.image;
        });

        const [reviews] = await db.query('SELECT * FROM reviews ORDER BY id DESC');

        const categoryTitles = {
            'buming': 'Promo Buming',
            'pasti-hemat': 'Pasti Hemat',
            'gaspol': 'Gaspol',
            'breadco': 'Breadco Bakery',
            'roti-bakar': 'Roti Bakar'
        };

        res.render('index', {
            title: 'Katalog Promo Yomart Rambay',
            products: products,
            banners: banners,
            reviews: reviews,
            currentCategory: currentCategory,
            categoryTitle: categoryTitles[currentCategory] || 'Promo Buming',
            adminWhatsAppNumber: ADMIN_WA_NUMBER
        });
    } catch (error) {
        console.error('Error katalog utama:', error);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});

// Halaman Khusus Tiap Kategori Promo
route.get('/promo/:category', async (req, res) => {
    try {
        const categoryKey = req.params.category;

        const categoryTitles = {
            'buming': 'Promo Buming',
            'pasti-hemat': 'Pasti Hemat',
            'gaspol': 'Gaspol',
            'breadco': 'Breadco Bakery',
            'roti-bakar': 'Roti Bakar'
        };

        const currentTitle = categoryTitles[categoryKey] || 'Promo Spesial';

        const [products] = await db.query(
            'SELECT * FROM products WHERE category = ? ORDER BY id DESC',
            [categoryKey]
        );

        const bannerDbName = `promo_${categoryKey.replace(/-/g, '_')}`;
        const [bannerRows] = await db.query('SELECT image FROM banners WHERE name = ? LIMIT 1', [bannerDbName]);
        const categoryBanner = bannerRows.length > 0 ? bannerRows[0].image : null;

        res.render('promo-category', {
            title: `${currentTitle} - Yomart Rambay`,
            products: products,
            currentCategory: categoryKey,
            categoryTitle: currentTitle,
            categoryBanner: categoryBanner,
            adminWhatsAppNumber: ADMIN_WA_NUMBER
        });
    } catch (error) {
        console.error('Error kategori promo:', error);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});

// Halaman Event
route.get('/event', async (req, res) => {
    try {
        const [events] = await db.query('SELECT * FROM events ORDER BY id DESC');
        res.render('event', {
            title: 'Event & Promo Spesial - Yomart Rambay',
            events: events,
            adminWhatsAppNumber: ADMIN_WA_NUMBER
        });
    } catch (error) {
        console.error('Error halaman event:', error);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});

// Halaman About Me
route.get('/about', (req, res) => {
    res.render('about', {
        title: 'About Me - Reza Septa Fauziansyah',
        adminWhatsAppNumber: ADMIN_WA_NUMBER
    });
});


route.get(ADMIN_LOGIN_PATH, (req, res) => {
    if (req.session && req.session.adminId) {
        return res.redirect(ADMIN_DASHBOARD_PATH);
    }
    res.render('login', {
        title: 'Login Admin Yomart',
        adminLoginPath: ADMIN_LOGIN_PATH,
        error: [],
        success: []
    });
});

route.post(ADMIN_LOGIN_PATH, loginLimiter, login);

route.get('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) console.error('Error saat logout:', err);
            res.clearCookie('connect.sid');
            return res.redirect(ADMIN_LOGIN_PATH);
        });
    } else {
        res.clearCookie('connect.sid');
        return res.redirect(ADMIN_LOGIN_PATH);
    }
});


route.get(ADMIN_DASHBOARD_PATH, requireAuth, preventCache, async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products ORDER BY id DESC');

        const [bannerRows] = await db.query('SELECT * FROM banners');
        const banners = {};
        bannerRows.forEach(b => {
            banners[b.name] = b.image;
        });

        const [reviews] = await db.query('SELECT * FROM reviews ORDER BY id DESC');
        const [events] = await db.query('SELECT * FROM events ORDER BY id DESC');

        res.render('admindashboard', {
            title: 'Dashboard Admin - Yomart Rambay',
            username: req.session.username,
            products: products,
            banners: banners,
            reviews: reviews,
            events: events,
            adminDashboardPath: ADMIN_DASHBOARD_PATH,
            message: req.query.msg || null,
            errorMsg: req.query.err || null
        });
    } catch (error) {
        console.error('Error dashboard:', error);
        res.status(500).send('Terjadi kesalahan pada server');
    }
});

route.post('/admin/events/add', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, period, description } = req.body;

        if (!title || !req.file) {
            if (req.file) safeUnlink(path.join('public/image', req.file.filename));
            return res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Judul Event dan Foto Banner wajib diisi!`);
        }

        await db.query(
            'INSERT INTO events (title, period, description, image) VALUES (?, ?, ?, ?)',
            [title, period || '', description || '', req.file.filename]
        );

        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Event baru berhasil ditambahkan!`);
    } catch (error) {
        if (req.file) safeUnlink(path.join('public/image', req.file.filename));
        console.error('Error tambah event:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal menambahkan event`);
    }
});

route.post('/admin/events/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query('SELECT image FROM events WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].image) {
            safeUnlink(path.join('public/image', rows[0].image));
        }

        await db.query('DELETE FROM events WHERE id = ?', [id]);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Event berhasil dihapus!`);
    } catch (error) {
        console.error('Error hapus event:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal menghapus event`);
    }
});

route.post('/admin/banner/upload/:type', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { type } = req.params;

        if (!req.file) {
            return res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Silakan pilih foto banner terlebih dahulu!`);
        }

        const bannerName = `promo_${type}`;

        const [existing] = await db.query('SELECT image FROM banners WHERE name = ? LIMIT 1', [bannerName]);
        if (existing.length > 0 && existing[0].image) {
            safeUnlink(path.join('public/image', existing[0].image));
        }

        await db.query(`
            INSERT INTO banners (name, image) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE image = ?
        `, [bannerName, req.file.filename, req.file.filename]);

        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Banner promo berhasil diperbarui!`);
    } catch (error) {
        if (req.file) safeUnlink(path.join('public/image', req.file.filename));
        console.error('Error upload banner:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal mengupload banner`);
    }
});

route.post('/admin/banner/delete/:type', requireAuth, async (req, res) => {
    try {
        const { type } = req.params;
        const bannerName = `promo_${type}`;

        const [existing] = await db.query('SELECT image FROM banners WHERE name = ? LIMIT 1', [bannerName]);
        if (existing.length > 0 && existing[0].image) {
            safeUnlink(path.join('public/image', existing[0].image));
        }

        await db.query('DELETE FROM banners WHERE name = ?', [bannerName]);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Banner promo berhasil direset ke default!`);
    } catch (error) {
        console.error('Error hapus banner:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal mereset banner`);
    }
});

route.post('/admin/reviews/upload', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Silakan pilih screenshot foto ulasan terlebih dahulu!`);
        }

        const title = req.body.title || 'Ulasan';

        await db.query(
            'INSERT INTO reviews (title, image) VALUES (?, ?)',
            [title, req.file.filename]
        );

        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Foto ulasan pelanggan berhasil diupload!`);
    } catch (error) {
        if (req.file) safeUnlink(path.join('public/image', req.file.filename));
        console.error('Error upload ulasan:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal mengupload ulasan`);
    }
});

route.post('/admin/reviews/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query('SELECT image FROM reviews WHERE id = ?', [id]);
        if (rows.length > 0 && rows[0].image) {
            safeUnlink(path.join('public/image', rows[0].image));
        }

        await db.query('DELETE FROM reviews WHERE id = ?', [id]);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Foto ulasan berhasil dihapus!`);
    } catch (error) {
        console.error('Error hapus ulasan:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal menghapus foto ulasan`);
    }
});


route.post('/admin/products/add', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { name, category, sub_category, price, original_price, myyogya_price, promo_end, description } = req.body;

        if (!name || !category || !price) {
            if (req.file) safeUnlink(path.join('public/image', req.file.filename));
            return res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Nama, Kategori Promo, dan Harga Promo wajib diisi!`);
        }

        const image = req.file ? req.file.filename : 'default.jpg';
        const origPrice = original_price ? parseInt(original_price, 10) : null;
        const myYogyaPrice = myyogya_price ? parseInt(myyogya_price, 10) : null;
        const numPrice = parseInt(price, 10);

        await db.query(
            'INSERT INTO products (name, category, sub_category, price, original_price, myyogya_price, promo_end, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, category, sub_category || 'beverages', numPrice, origPrice, myYogyaPrice, promo_end || null, description || '', image]
        );

        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Produk promo berhasil ditambahkan!`);
    } catch (error) {
        if (req.file) safeUnlink(path.join('public/image', req.file.filename));
        console.error('Error tambah produk:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal menambahkan produk`);
    }
});

route.post('/admin/products/edit/:id', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, sub_category, price, original_price, myyogya_price, promo_end, description } = req.body;
        
        const origPrice = original_price ? parseInt(original_price, 10) : null;
        const myYogyaPrice = myyogya_price ? parseInt(myyogya_price, 10) : null;
        const numPrice = parseInt(price, 10);

        if (req.file) {
            const [oldProducts] = await db.query('SELECT image FROM products WHERE id = ?', [id]);
            if (oldProducts.length > 0 && oldProducts[0].image && oldProducts[0].image !== 'default.jpg') {
                safeUnlink(path.join('public/image', oldProducts[0].image));
            }

            await db.query(
                'UPDATE products SET name = ?, category = ?, sub_category = ?, price = ?, original_price = ?, myyogya_price = ?, promo_end = ?, description = ?, image = ? WHERE id = ?',
                [name, category, sub_category || 'beverages', numPrice, origPrice, myYogyaPrice, promo_end || null, description || '', req.file.filename, id]
            );
        } else {
            await db.query(
                'UPDATE products SET name = ?, category = ?, sub_category = ?, price = ?, original_price = ?, myyogya_price = ?, promo_end = ? WHERE id = ?',
                [name, category, sub_category || 'beverages', numPrice, origPrice, myYogyaPrice, promo_end || null, id]
            );
        }

        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Data produk berhasil diperbarui!`);
    } catch (error) {
        if (req.file) safeUnlink(path.join('public/image', req.file.filename));
        console.error('Error edit produk:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal memperbarui produk: ${error.message}`);
    }
});

route.post('/admin/products/delete/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const [products] = await db.query('SELECT image FROM products WHERE id = ?', [id]);
        if (products.length > 0 && products[0].image && products[0].image !== 'default.jpg') {
            safeUnlink(path.join('public/image', products[0].image));
        }

        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=Produk berhasil dihapus!`);
    } catch (error) {
        console.error('Error hapus satu produk:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal menghapus produk`);
    }
});

route.post('/admin/products/bulk-delete', requireAuth, async (req, res) => {
    try {
        let { product_ids } = req.body;

        if (!product_ids) {
            return res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Pilih minimal satu produk untuk dihapus!`);
        }

        if (!Array.isArray(product_ids)) {
            product_ids = [product_ids];
        }

        const ids = product_ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);

        if (ids.length === 0) {
            return res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Tidak ada produk valid yang dipilih!`);
        }

        const [rows] = await db.query('SELECT image FROM products WHERE id IN (?)', [ids]);
        rows.forEach(p => {
            if (p.image && p.image !== 'default.jpg') {
                safeUnlink(path.join('public/image', p.image));
            }
        });

        const [result] = await db.query('DELETE FROM products WHERE id IN (?)', [ids]);

        res.redirect(`${ADMIN_DASHBOARD_PATH}?msg=${result.affectedRows} produk berhasil dihapus sekaligus!`);
    } catch (error) {
        console.error('Error bulk delete produk:', error);
        res.redirect(`${ADMIN_DASHBOARD_PATH}?err=Gagal menghapus produk terpilih`);
    }
});

export default route;