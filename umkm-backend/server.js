// Import modul yang diperlukan
const express = require('express');
const fs = require('fs').promises; // Kita pakai 'fs.promises' untuk async/await
const cors = require('cors');

// Inisialisasi aplikasi Express
const app = express();
const PORT = 3000; // Backend akan berjalan di port 3000

// Middleware
app.use(cors()); // Mengizinkan Cross-Origin Resource Sharing (CORS)
app.use(express.json()); // Mengizinkan server membaca JSON dari body request

// Path ke file database kita
const DB_PATH = './db.json';

// --- FUNGSI HELPER (BACA/TULIS DB) ---

// Fungsi untuk membaca database
async function readDB() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error membaca database:", error);
        // Jika file tidak ada atau error, kembalikan struktur default
        return { admins: [], products: [], umkms: [] };
    }
}

// Fungsi untuk menulis ke database
async function writeDB(data) {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error menulis ke database:", error);
    }
}

// 5. Endpoint untuk GET (mengambil) semua UMKM
app.get('/umkms', async (req, res) => {
    const db = await readDB();
    res.json(db.umkms);
});

// 6. Endpoint untuk POST (menambah) UMKM baru
app.post('/umkms', async (req, res) => {
    const newUMKM = req.body;
    // Buat ID unik sederhana
    newUMKM.id = Date.now().toString();
    
    const db = await readDB();
    db.umkms.push(newUMKM);
    await writeDB(db);
    
    res.status(201).json(newUMKM);
});

// 7. Endpoint untuk DELETE (menghapus) UMKM
app.delete('/umkms/:id', async (req, res) => {
    const { id } = req.params;
    
    const db = await readDB();
    db.umkms = db.umkms.filter((umkm) => umkm.id !== id);
    await writeDB(db);
    
    res.json({ success: true, message: 'UMKM berhasil dihapus.' });
});
// 8. Endpoint untuk POST (Login) Admin
app.post('/login', async (req, res) => {
    // 1. Ambil username dan password dari body request
    const { username, password } = req.body;

    // 2. Baca database
    const db = await readDB();

    // 3. Cari admin berdasarkan username
    const admin = db.admins.find(
        (a) => a.username === username
    );

    // 4. Periksa apakah admin ada DAN password-nya cocok
    if (admin && admin.password === password) {
        // Jika cocok, kirim respon sukses
        res.json({ success: true, message: 'Login berhasil!' });
    } else {
        // Jika tidak cocok, kirim respon gagal (401 Unauthorized)
        res.status(401).json({ success: false, message: 'Username atau password salah.' });
    }
});

// ... (kode sebelumnya tetap sama)

// --- FITUR TRACKING ---

// 9. Endpoint untuk Mencatat Kunjungan Website (Visitor Counter)
app.post('/visit', async (req, res) => {
    const db = await readDB();
    
    // Jika belum ada stats, buat baru
    if (!db.stats) {
        db.stats = { visitors: 0 };
    }

    db.stats.visitors += 1; // Tambah 1 pengunjung
    await writeDB(db);

    res.json({ visitors: db.stats.visitors });
});

// 10. Endpoint untuk Mengambil Jumlah Pengunjung (Tanpa menambah)
app.get('/visit', async (req, res) => {
    const db = await readDB();
    const count = db.stats ? db.stats.visitors : 0;
    res.json({ visitors: count });
});

// 11. Endpoint untuk Mencatat Klik WhatsApp per UMKM
app.post('/umkms/:id/click-wa', async (req, res) => {
    const { id } = req.params;
    const db = await readDB();

    const umkmIndex = db.umkms.findIndex((u) => u.id === id);

    if (umkmIndex !== -1) {
        // Jika belum ada field waClicks, set jadi 0 dulu
        if (!db.umkms[umkmIndex].waClicks) {
            db.umkms[umkmIndex].waClicks = 0;
        }

        db.umkms[umkmIndex].waClicks += 1;
        await writeDB(db);
        
        res.json({ 
            success: true, 
            clicks: db.umkms[umkmIndex].waClicks, 
            message: 'Klik WA tercatat' 
        });
    } else {
        res.status(404).json({ success: false, message: 'UMKM tidak ditemukan' });
    }
});

// --- Menjalankan Server ---
app.listen(PORT, () => {
    console.log(`Server backend berjalan di http://localhost:${PORT}`);
});