require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const multerStorageCloudinary = require('multer-storage-cloudinary');
const CloudinaryStorage = multerStorageCloudinary.CloudinaryStorage || multerStorageCloudinary;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- KONEKSI DATABASE ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Sukses terkoneksi ke MongoDB'))
    .catch(err => console.error('Gagal konek MongoDB:', err));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'umkm-sabah-balau',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});
const upload = multer({ storage: storage });

// --- SCHEMA DATABASE ---
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

// --- KONFIGURASI STATIC FILES (PENTING) ---
// Melayani file frontend dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- ENDPOINTS ---

// 1. Setup Admin (PINTU BELAKANG - Akses ini untuk buat admin)
app.get('/setup-admin', async (req, res) => {
    try {
        const exist = await Admin.findOne({ username: 'admin' });
        if (!exist) {
            await Admin.create({ username: 'admin', password: 'admin123' });
            res.send('<h1>SUKSES!</h1><p>Admin berhasil dibuat.</p><p>Username: <b>admin</b></p><p>Password: <b>admin123</b></p><br><a href="/">Kembali ke Home</a>');
        } else {
            res.send('<h1>Admin Sudah Ada</h1><p>Silakan login dengan username: <b>admin</b></p><br><a href="/">Kembali ke Home</a>');
        }
    } catch (error) {
        res.status(500).send('Error database: ' + error.message);
    }
});

// 2. Data UMKM
app.get('/umkms', async (req, res) => {
    try {
        const umkms = await Umkm.find();
        res.json(umkms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/umkms', upload.single('imageFile'), async (req, res) => {
    try {
        let imageUrl = req.body.imageUrl || null;
        if (req.file && req.file.path) imageUrl = req.file.path;

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
        res.status(500).json({ message: "Gagal menyimpan data" });
    }
});

app.put('/umkms/:id', upload.single('imageFile'), async (req, res) => {
    try {
        const oldData = await Umkm.findOne({ id: req.params.id });
        if (!oldData) return res.status(404).json({ success: false, message: 'UMKM tidak ditemukan.' });

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
        res.status(500).json({ message: "Gagal update data" });
    }
});

app.delete('/umkms/:id', async (req, res) => {
    try {
        await Umkm.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: "Gagal menghapus" });
    }
});

// 3. Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (admin) res.json({ success: true, message: 'Login berhasil!' });
    else res.status(401).json({ success: false, message: 'Salah username/password' });
});

// 4. Stats
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
    let stats = await Stat.findOne({ name: 'main_stats' });
    if (!stats) stats = await Stat.create({ name: 'main_stats' });
    const currentClicks = stats.waClicks.get(req.params.id) || 0;
    stats.waClicks.set(req.params.id, currentClicks + 1);
    await stats.save();
    res.json({ success: true });
});

// 5. Route Utama (Harus paling bawah)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}