import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import mysqlSession from 'express-mysql-session';
import route from './routes/route.js';
import { initDatabase } from './database/init.js';

const app = express();
const port = process.env.PORT || 3000;

// Inisialisasi Struktur Tabel Database
initDatabase();

// Konfigurasi Database Session MySQL
const option = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME
};

const MySqlStore = mysqlSession(session);
const sessionstore = new MySqlStore(option);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);

// Konfigurasi Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key-yomart-666',
    resave: false,
    saveUninitialized: false,
    store: sessionstore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 hari
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Gunakan Routes
app.use(route);

// Jalankan Server
app.listen(port, () => {
    console.log(`🚀 Server Yomart berjalan di: http://localhost:${port}`);
});