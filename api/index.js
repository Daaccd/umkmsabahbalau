require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');

// --- IMPORT LIBRARY ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. KONEKSI DATABASE (Anti-Double Connect) ---
if (mongoose.connection.readyState === 0) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('MongoDB Terkoneksi'))
        .catch(err => console.error('MongoDB Gagal:', err));
}

// --- 2. KONFIGURASI CLOUDINARY (STRICT MODE) ---
// Cek apakah password ada di Vercel?
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("FATAL ERROR: Environment Variables Cloudinary KOSONG/TIDAK TERBACA!");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Storage Langsung (Tanpa Try-Catch agar Error terlihat)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'umkm-sabah-balau',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage });

// --- 3. DATABASE MODELS (Anti-Overwrite) ---
const UmkmSchema = new mongoose.Schema({
    id: { type: String, default: () => Date.now().toString() },
    name: String,
    specialty: String,
    description: String,
    phone: String,
    address: String,
    mapSrcUrl: String,
    image: String
});
const Umkm = mongoose.models.Umkm || mongoose.model('Umkm', UmkmSchema);

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
});
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

const StatSchema = new mongoose.Schema({
    name: { type: String, default: 'main_stats' },
    visits: { type: Number, default: 0 },
    waClicks: { type: Map, of: Number, default: {} }
});
const Stat = mongoose.models.Stat || mongoose.model('Stat', StatSchema);

// --- 4. STATIC FILES (Frontend) ---
app.use(express.static(path.join(__dirname, '../public')));

// --- 5. MIDDLEWARE ERROR UPLOAD ---
const uploadHandler = (req, res, next) => {
    upload.single('imageFile')(req, res, (err) => {
        if (err) {
            console.error("UPLOAD ERROR (Cloudinary):", err);
            return res.status(500).json({ 
                message: "Gagal Upload Gambar. Cek Config Cloudinary di Vercel.", 
                error: err.message 
            });
        }
        next();
    });
};

// --- 6. ENDPOINTS ---

// Setup Admin
app.get('/setup-admin', async (req, res) => {
    try {
        const exist = await Admin.findOne({ username: 'admin' });
        if (!exist) {
            await Admin.create({ username: 'admin', password: 'admin123' });
            res.send('<h1>SUKSES</h1>Admin dibuat: admin / admin123<br><a href="/">Kembali</a>');
        } else {
            res.send('<h1>Admin Sudah Ada</h1><a href="/">Kembali</a>');
        }
    } catch (e) { res.status(500).send(e.message); }
});

// Get Data
app.get('/umkms', async (req, res) => {
    const umkms = await Umkm.find();
    res.json(umkms);
});

// Tambah Data (Pakai Upload Handler)
app.post('/umkms', uploadHandler, async (req, res) => {
    try {
        let imageUrl = req.body.imageUrl || null;
        // Ambil URL dari Cloudinary jika ada file
        if (req.file && req.file.path) {
            imageUrl = req.file.path;
        }

        const newUMKM = new Umkm({
            name: req.body.name,
            specialty: req.body.specialty,
            description: req.body.description,
            phone: req.body.phone,
            address: req.body.address,
            mapSrcUrl: req.body.mapSrcUrl,
            image: imageUrl
        });
        await newUMKM.save();
        res.status(201).json(newUMKM);
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ message: "Gagal simpan data" });
    }
});

// Edit Data
app.put('/umkms/:id', uploadHandler, async (req, res) => {
    try {
        const oldData = await Umkm.findOne({ id: req.params.id });
        if (!oldData) return res.status(404).json({ message: 'Not found' });

        let finalImage = oldData.image; 
        if (req.file && req.file.path) finalImage = req.file.path;
        else if (req.body.imageUrl && req.body.imageUrl.trim() !== "") finalImage = req.body.imageUrl;

        oldData.name = req.body.name;
        oldData.specialty = req.body.specialty;
        oldData.description = req.body.description;
        oldData.phone = req.body.phone;
        oldData.address = req.body.address;
        oldData.mapSrcUrl = req.body.mapSrcUrl;
        oldData.image = finalImage;

        await oldData.save();
        res.json({ success: true });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ message: "Gagal update" });
    }
});

// Hapus Data
app.delete('/umkms/:id', async (req, res) => {
    await Umkm.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (admin) res.json({ success: true });
    else res.status(401).json({ success: false });
});

// Stats
app.get('/stats', async (req, res) => {
    try {
        let stats = await Stat.findOne({ name: 'main_stats' });
        if (!stats) stats = await Stat.create({ name: 'main_stats' });
        res.json(stats);
    } catch (e) { res.json({ visits: 0 }); }
});

app.post('/stats/visit', async (req, res) => {
    try {
        let stats = await Stat.findOne({ name: 'main_stats' });
        if (!stats) stats = await Stat.create({ name: 'main_stats' });
        stats.visits += 1;
        await stats.save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.post('/stats/wa-click/:id', async (req, res) => {
    try {
        let stats = await Stat.findOne({ name: 'main_stats' });
        if (!stats) stats = await Stat.create({ name: 'main_stats' });
        const currentClicks = stats.waClicks.get(req.params.id) || 0;
        stats.waClicks.set(req.params.id, currentClicks + 1);
        await stats.save();
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// Route Utama (Support Express 5)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

module.exports = app;