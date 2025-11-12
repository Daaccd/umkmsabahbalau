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

// --- API ENDPOINTS ---

// 1. Endpoint untuk Login Admin
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = await readDB();
    
    // Cari admin di database
    const admin = db.admins.find(
        (user) => user.username === username && user.password === password
    );
    
    if (admin) {
        // Login sukses
        res.json({ success: true, message: 'Login berhasil!' });
    } else {
        // Login gagal
        res.status(401).json({ success: false, message: 'Username atau password salah!' });
    }
});

// 2. Endpoint untuk GET (mengambil) semua Produk
app.get('/products', async (req, res) => {
    const db = await readDB();
    res.json(db.products);
});

// 3. Endpoint untuk POST (menambah) Produk baru
app.post('/products', async (req, res) => {
    const newProduct = req.body;
    // Buat ID unik sederhana
    newProduct.id = Date.now().toString(); 
    
    const db = await readDB();
    db.products.push(newProduct);
    await writeDB(db);
    
    res.status(201).json(newProduct);
});

// 4. Endpoint untuk DELETE (menghapus) Produk
app.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    
    const db = await readDB();
    // Filter produk, sisakan yang ID-nya TIDAK SAMA dengan id yang mau dihapus
    db.products = db.products.filter((product) => product.id !== id);
    await writeDB(db);
    
    res.json({ success: true, message: 'Produk berhasil dihapus.' });
});

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


// --- Menjalankan Server ---
app.listen(PORT, () => {
    console.log(`Server backend berjalan di http://localhost:${PORT}`);
});