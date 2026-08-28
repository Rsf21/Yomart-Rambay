import bcrypt from 'bcrypt';
import db from '../database/db.js';

export const login = async (req, res) => {
    const ADMIN_LOGIN_PATH = process.env.ADMIN_LOGIN_PATH || '/bar4ccudaxxx';
    const ADMIN_DASHBOARD_PATH = process.env.ADMIN_DASHBOARD_PATH || '/b4rracudax666xxx';

    try {
        const { username, password } = req.body;

        // 1. Validasi input kosong
        if (!username || !password) {
            return res.status(400).render('login', {
                title: 'Form Login Admin',
                adminLoginPath: ADMIN_LOGIN_PATH,
                error: ['Field username dan password tidak boleh kosong!'],
                success: []
            });
        }

        // 2. Cari admin di database
        const [users] = await db.query(
            'SELECT * FROM admins WHERE username = ? LIMIT 1',
            [username.trim()]
        );

        if (users.length === 0) {
            return res.status(401).render('login', {
                title: 'Form Login Admin',
                adminLoginPath: ADMIN_LOGIN_PATH,
                error: ['Username atau password salah!'],
                success: []
            });
        }

        const user = users[0];

        // 3. Cek kecocokan password hash bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).render('login', {
                title: 'Form Login Admin',
                adminLoginPath: ADMIN_LOGIN_PATH,
                error: ['Username atau password salah!'],
                success: []
            });
        }

        // 4. Regenerasi Sesi untuk mencegah Session Fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Gagal regenerasi sesi:', err);
                return res.status(500).render('login', {
                    title: 'Form Login Admin',
                    adminLoginPath: ADMIN_LOGIN_PATH,
                    error: ['Gagal membuat sesi login, silakan coba lagi.'],
                    success: []
                });
            }

            // Simpan data sesi baru
            req.session.adminId = user.id;
            req.session.username = user.username;

            // Pastikan sesi tersimpan ke MySQL sebelum redirect
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('Gagal menyimpan sesi ke database:', saveErr);
                }
                res.redirect(ADMIN_DASHBOARD_PATH);
            });
        });

    } catch (err) {
        console.error('Error saat login:', err);
        res.status(500).render('login', {
            title: 'Form Login Admin',
            adminLoginPath: ADMIN_LOGIN_PATH,
            error: ['Terjadi kesalahan internal server saat memproses login.'],
            success: []
        });
    }
};

// Bonus: Kamu juga bisa satukan fungsi logout di sini
export const logout = (req, res) => {
    const ADMIN_LOGIN_PATH = process.env.ADMIN_LOGIN_PATH || '/bar4ccudaxxx';
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Gagal menghancurkan sesi:', err);
        }
        res.clearCookie('connect.sid'); // Bersihkan cookie session browser
        res.redirect(ADMIN_LOGIN_PATH);
    });
};