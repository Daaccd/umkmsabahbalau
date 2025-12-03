require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream'); // Native Node.js stream

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. KONEKSI DATABASE ---
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Terkoneksi");
    } catch (error) {
        console.error("Gagal Konek MongoDB:", error);
    }
};

app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// --- 2. CONFIG CLOUDINARY ---
if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.error("WARNING: Config Cloudinary Kosong!");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- 3. SETUP MULTER (MEMORY STORAGE) ---
// Simpan file di memory sementara (RAM), bukan di folder
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 4. FUNGSI HELPER UPLOAD (JURUS LANGSUNG) ---
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                folder: 'umkm-sabah-balau',
                resource_type: 'auto' 
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Error:", error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        // Konversi buffer ke stream agar bisa diupload
        const stream = Readable.from(buffer);
        stream.pipe(uploadStream);
    });
};

// --- 5. MODELS ---
const Umkm = mongoose.models.Umkm || mongoose.model('Umkm', new mongoose.Schema({
    id: { type: String, default: () => Date.now().toString() },
    name: String,
    specialty: String,
    description: String,
    phone: String,
    address: String,
    mapSrcUrl: String,
    image: String
}));

const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }
}));

const Stat = mongoose.models.Stat || mongoose.model('Stat', new mongoose.Schema({
    name: { type: String, default: 'main_stats' },
    visits: { type: Number, default: 0 },
    waClicks: { type: Map, of: Number, default: {} }
}));

// --- 6. STATIC FILES ---
app.use(express.static(path.join(__dirname, '../public')));

// --- 7. ENDPOINTS ---

// Setup Admin
app.get('/setup-admin', async (req, res) => {
    try {
        const exist = await Admin.findOne({ username: 'admin' });
        if (!exist) {
            await Admin.create({ username: 'admin', password: 'admin123' });
            res.send('<h1>SUKSES</h1>Admin dibuat: admin / admin123');
        } else {
            res.send('<h1>Admin Sudah Ada</h1>');
        }
    } catch (e) { res.status(500).send(e.message); }
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username, password });
        if (admin) res.json({ success: true });
        else res.status(401).json({ success: false, message: 'Salah username/password' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET UMKM
app.get('/umkms', async (req, res) => {
    const umkms = await Umkm.find();
    res.json(umkms);
});

// POST UMKM (Updated Logic)
app.post('/umkms', upload.single('imageFile'), async (req, res) => {
    try {
        let imageUrl = req.body.imageUrl || null;
        
        // Jika ada file diupload, kirim ke Cloudinary via Helper
        if (req.file) {
            console.log("Mengupload gambar ke Cloudinary...");
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            imageUrl = uploadResult.secure_url; // Dapat URL dari Cloudinary
            console.log("Upload Sukses:", imageUrl);
        }

        await Umkm.create({
            name: req.body.name,
            specialty: req.body.specialty,
            description: req.body.description,
            phone: req.body.phone,
            address: req.body.address,
            mapSrcUrl: req.body.mapSrcUrl,
            image: imageUrl
        });
        res.status(201).json({ success: true });
    } catch (e) {
        console.error("Error Tambah Data:", e);
        res.status(500).json({ message: "Gagal: " + e.message });
    }
});

// PUT UMKM (Updated Logic)
app.put('/umkms/:id', upload.single('imageFile'), async (req, res) => {
    try {
        const oldData = await Umkm.findOne({ id: req.params.id });
        if (!oldData) return res.status(404).json({ message: 'Not found' });

        let finalImage = oldData.image; 
        
        // Cek jika ada file baru diupload
        if (req.file) {
            console.log("Mengupload gambar baru...");
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            finalImage = uploadResult.secure_url;
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
        res.json({ success: true });
    } catch (e) {
        console.error("Error Edit Data:", e);
        res.status(500).json({ message: e.message });
    }
});

// Delete & Stats...
app.delete('/umkms/:id', async (req, res) => {
    await Umkm.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

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
    } catch (e) { res.json({}); }
});
app.post('/stats/wa-click/:id', async (req, res) => {
    try {
        let stats = await Stat.findOne({ name: 'main_stats' });
        if (!stats) stats = await Stat.create({ name: 'main_stats' });
        const currentClicks = stats.waClicks.get(req.params.id) || 0;
        stats.waClicks.set(req.params.id, currentClicks + 1);
        await stats.save();
        res.json({ success: true });
    } catch (e) { res.json({}); }
});

app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

module.exports = app;