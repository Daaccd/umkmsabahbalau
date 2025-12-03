require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// --- PERBAIKAN IMPORT CLOUDINARY STORAGE ---
const multerStorageCloudinary = require('multer-storage-cloudinary');
// Cek apakah library exportnya berbentuk object atau langsung class
const CloudinaryStorage = multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. KONEKSI DATABASE & CONFIG ---

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Sukses terkoneksi ke MongoDB'))
    .catch(err => console.error('Gagal konek MongoDB:', err));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Config Upload ke Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'umkm-sabah-balau',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage: storage });

// --- 2. DATABASE SCHEMA ---

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
const Umkm = mongoose.model('Umkm', UmkmSchema);

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', AdminSchema);

const StatSchema = new mongoose.Schema({
    name: { type: String, default: 'main_stats' },
    visits: { type: Number, default: 0 },
    waClicks: { type: Map, of: Number, default: {} }
});
const Stat = mongoose.model('Stat', StatSchema);

// --- 3. ENDPOINTS ---

// PENTING: Serve file statis (Frontend)
app.use(express.static(__dirname)); 

// Route Halaman Utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// GET Semua UMKM
app.get('/umkms', async (req, res) => {
    try {
        const umkms = await Umkm.find();
        res.json(umkms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST (Tambah) UMKM
app.post('/umkms', upload.single('imageFile'), async (req, res) => {
    try {
        let imageUrl = req.body.imageUrl || null;
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
        console.error(error);
        res.status(500).json({ message: "Gagal menyimpan data" });
    }
});

// PUT (Edit) UMKM
app.put('/umkms/:id', upload.single('imageFile'), async (req, res) => {
    try {
        const { id } = req.params;
        const oldData = await Umkm.findOne({ id: id });

        if (!oldData) return res.status(404).json({ success: false, message: 'UMKM tidak ditemukan.' });

        let finalImage = oldData.image; 
        if (req.file && req.file.path) {
            finalImage = req.file.path;
        } else if (req.body.imageUrl && req.body.imageUrl.trim() !== "") {
            finalImage = req.body.imageUrl;
        }

        oldData.name = req.body.name;
        oldData.specialty = req.body.specialty;
        oldData.description = req.body.description;
        oldData.phone = req.body.phone;
        oldData.address = req.body.address;
        oldData.mapSrcUrl = req.body.mapSrcUrl;
        oldData.image = finalImage;

        await oldData.save();
        res.json({ success: true, message: 'UMKM berhasil diupdate.' });
    } catch (error) {
        res.status(500).json({ message: "Gagal update data" });
    }
});

// DELETE UMKM
app.delete('/umkms/:id', async (req, res) => {
    try {
        await Umkm.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Gagal menghapus" });
    }
});

// LOGIN
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (admin) {
        res.json({ success: true, message: 'Login berhasil!' });
    } else {
        res.status(401).json({ success: false, message: 'Salah username/password' });
    }
});

// SETUP ADMIN (Akses link ini sekali saja: /setup-admin)
app.get('/setup-admin', async (req, res) => {
    const exist = await Admin.findOne({ username: 'admin' });
    if (!exist) {
        await Admin.create({ username: 'admin', password: 'admin123' });
        res.send('Admin dibuat: admin / admin123');
    } else {
        res.send('Admin sudah ada');
    }
});

// STATS
app.get('/stats', async (req, res) => {
    let stats = await Stat.findOne({ name: 'main_stats' });
    if (!stats) stats = await Stat.create({ name: 'main_stats' });
    res.json(stats);
});

app.post('/stats/visit', async (req, res) => {
    let stats = await Stat.findOne({ name: 'main_stats' });
    if (!stats) stats = await Stat.create({ name: 'main_stats' });
    stats.visits += 1;
    await stats.save();
    res.json({ success: true });
});

app.post('/stats/wa-click/:id', async (req, res) => {
    const { id } = req.params;
    let stats = await Stat.findOne({ name: 'main_stats' });
    if (!stats) stats = await Stat.create({ name: 'main_stats' });
    const currentClicks = stats.waClicks.get(id) || 0;
    stats.waClicks.set(id, currentClicks + 1);
    await stats.save();
    res.json({ success: true });
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}