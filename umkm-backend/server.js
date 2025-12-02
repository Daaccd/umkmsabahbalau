const express = require('express');
const fs = require('fs').promises; 
const fsDirect = require('fs'); 
const cors = require('cors');
const path = require('path');   
const multer = require('multer'); 

const app = express();
const PORT = 3000; 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// --- KONFIGURASI UPLOAD ---
const uploadDir = './uploads';
if (!fsDirect.existsSync(uploadDir)){
    fsDirect.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Folder uploads bisa diakses browser
app.use('/uploads', express.static('uploads'));

const DB_PATH = './db.json';

// --- FUNGSI HELPER DB ---
async function readDB() {
    const defaultData = { admins: [], umkms: [], stats: { visits: 0, waClicks: {} } };
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        if (!data || data.trim() === "") return defaultData;
        return JSON.parse(data);
    } catch (error) {
        return defaultData;
    }
}

async function writeDB(data) {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error menulis DB:", error);
    }
}

// --- ENDPOINTS ---

// 1. GET Semua UMKM
app.get('/umkms', async (req, res) => {
    const db = await readDB();
    res.json(db.umkms || []);
});

// 2. POST (Tambah) UMKM
app.post('/umkms', upload.single('imageFile'), async (req, res) => {
    try {
        const db = await readDB();
        if (!db.umkms) db.umkms = [];

        const newUMKM = {
            id: Date.now().toString(),
            name: req.body.name,
            specialty: req.body.specialty,
            description: req.body.description,
            phone: req.body.phone,
            address: req.body.address,
            mapSrcUrl: req.body.mapSrcUrl,
            // Prioritas: File Upload > URL Manual > Null
            image: req.file 
                ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` 
                : (req.body.imageUrl || null)
        };
        
        db.umkms.push(newUMKM);
        await writeDB(db);
        res.status(201).json(newUMKM);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal menyimpan data" });
    }
});

// 3. PUT (Edit) UMKM
app.put('/umkms/:id', upload.single('imageFile'), async (req, res) => {
    const { id } = req.params;
    try {
        const db = await readDB();
        const index = db.umkms.findIndex(umkm => umkm.id === id);
        
        if (index !== -1) {
            const oldData = db.umkms[index];
            let finalImage = oldData.image; // Default pakai lama
            
            if (req.file) {
                // Jika ada file baru diupload
                finalImage = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            } else if (req.body.imageUrl && req.body.imageUrl.trim() !== "") {
                // Jika admin memasukkan URL baru (misal Google Drive)
                finalImage = req.body.imageUrl;
            }

            const updatedData = {
                id: id,
                name: req.body.name,
                specialty: req.body.specialty,
                description: req.body.description,
                phone: req.body.phone,
                address: req.body.address,
                mapSrcUrl: req.body.mapSrcUrl,
                image: finalImage
            };

            db.umkms[index] = updatedData;
            await writeDB(db);
            res.json({ success: true, message: 'UMKM berhasil diupdate.' });
        } else {
            res.status(404).json({ success: false, message: 'UMKM tidak ditemukan.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal update data" });
    }
});

// 4. DELETE UMKM
app.delete('/umkms/:id', async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    if (!db.umkms) db.umkms = [];
    db.umkms = db.umkms.filter((umkm) => umkm.id !== id);
    await writeDB(db);
    res.json({ success: true });
});

// 5. LOGIN
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = await readDB();
    const admin = (db.admins || []).find((a) => a.username === username);
    if (admin && admin.password === password) {
        res.json({ success: true, message: 'Login berhasil!' });
    } else {
        res.status(401).json({ success: false, message: 'Salah username/password' });
    }
});

// 6. STATS
app.get('/stats', async (req, res) => {
    const db = await readDB();
    res.json(db.stats || { visits: 0, waClicks: {} });
});

app.post('/stats/visit', async (req, res) => {
    const db = await readDB();
    if (!db.stats) db.stats = { visits: 0, waClicks: {} };
    if (!db.stats.visits) db.stats.visits = 0;
    db.stats.visits += 1;
    await writeDB(db);
    res.json({ success: true });
});

app.post('/stats/wa-click/:id', async (req, res) => {
    const { id } = req.params;
    const db = await readDB();
    if (!db.stats) db.stats = { visits: 0, waClicks: {} };
    if (!db.stats.waClicks) db.stats.waClicks = {};
    if (!db.stats.waClicks[id]) db.stats.waClicks[id] = 0;
    db.stats.waClicks[id] += 1;
    await writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});