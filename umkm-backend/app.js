// Alamat backend kita
const API_URL = 'http://localhost:3000';

// Status login (tetap pakai localStorage untuk status di browser)
let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

// --- FUNGSI RENDER (MENAMPILKAN DATA) ---

// Fungsi untuk menampilkan produk DIHAPUS

// Fungsi untuk menampilkan UMKM
async function renderUMKMs() {
    const container = document.getElementById('umkmContainer');
    container.innerHTML = '';

    // 1. Ambil data dari backend
    let umkms = [];
    try {
        const response = await fetch(`${API_URL}/umkms`);
        umkms = await response.json();
    } catch (error) {
        console.error('Gagal mengambil UMKM:', error);
        container.innerHTML = '<p>Gagal memuat data UMKM dari server.</p>';
        return;
    }
    
    if (umkms.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Belum ada UMKM. Silakan login sebagai admin untuk menambah UMKM.</p>';
        return;
    }

    umkms.forEach((umkm) => {
        const umkmCard = document.createElement('div');
        umkmCard.className = 'umkm-card';

        let deleteButton = '';
        if (isLoggedIn) {
            // PENTING: Kita ganti dari 'index' menjadi 'umkm.id'
            deleteButton = `<button class="delete-btn" onclick="deleteUMKM('${umkm.id}')">×</button>`;
        }
        
        // --- PERUBAHAN DIMULAI DISINI ---
        // 1. Membuat nomor WA yang valid (mengganti 0 di depan dengan 62)
        let waNumber = umkm.phone.replace(/[^0-9]/g, ''); // Hapus spasi, +, -
        if (waNumber.startsWith('0')) {
            waNumber = '62' + waNumber.substring(1);
        } else if (waNumber.length > 0 && !waNumber.startsWith('62')) { 
            // Jika nomornya 812... (tanpa 0), tambahkan 62
            waNumber = '62' + waNumber;
        }
        // --- AKHIR PERUBAHAN 1 ---

        umkmCard.innerHTML = `
            <div class="umkm-img" style="${umkm.image ? `background-image: url('${umkm.image}'); background-size: cover;` : ''}">
                ${!umkm.image ? 'Foto UMKM' : ''}
            </div>
            <div class="umkm-info">
                <h3>${umkm.name}</h3>
                <p class="specialty">Spesialisasi: ${umkm.specialty}</p>
                <p>${umkm.description}</p>
                
                <div class="contact-info">
                    <p><strong>Alamat:</strong> ${umkm.address || 'N/A'}</p>
                    <p><strong>Kontak:</strong> ${umkm.phone}</p>
                    
                    <div class="button-group">
                        <a href="${umkm.mapSrcUrl}" target="_blank" class="btn-small">Lihat Peta</a>
                        <a href="https://wa.me/${waNumber}" target="_blank" class="btn-small btn-whatsapp">Chat WA</a>
                    </div>
                    </div>
            </div>
            ${deleteButton}
        `;
        container.appendChild(umkmCard);
    });
}

// --- FUNGSI AKSI (TAMBAH, HAPUS, LOGIN) ---

// Fungsi untuk menambah profil UMKM
document.getElementById('umkmForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!isLoggedIn) return;

    // 1. Siapkan data dari form
    const newUMKM = {
        name: document.getElementById('umkmName').value,
        specialty: document.getElementById('umkmSpecialty').value,
        description: document.getElementById('umkmDescription').value,
        phone: document.getElementById('umkmPhone').value,
        email: document.getElementById('umkmEmail').value,
        address: document.getElementById('umkmAddress').value, // Menambahkan address
        mapSrcUrl: document.getElementById('umkmMapUrl').value, // Menambahkan mapSrcUrl
        image: document.getElementById('umkmImage').value || null
    };

    // 2. Kirim data ke backend
    try {
        const response = await fetch(`${API_URL}/umkms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUMKM)
        });

        if (response.ok) {
            renderUMKMs(); // Refresh daftar UMKM
            this.reset();
            document.getElementById('umkmContainer').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Gagal menambah profil UMKM.');
        }
    } catch (error) {
        console.error('Error menambah UMKM:', error);
    }
});


// Fungsi untuk menghapus profil UMKM (sekarang pakai ID)
async function deleteUMKM(id) {
    if (!isLoggedIn) return;
    if (!confirm('Apakah Anda yakin ingin menghapus profil UMKM ini?')) return;
    
    try {
        const response = await fetch(`${API_URL}/umkms/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            renderUMKMs(); // Refresh daftar UMKM
        } else {
            alert('Gagal menghapus profil UMKM.');
        }
    } catch (error) {
        console.error('Error menghapus UMKM:', error);
    }
}

// --- FUNGSI LOGIN / LOGOUT ---

// Fungsi untuk menampilkan atau menyembunyikan elemen admin
function toggleAdminElements() {
    const umkmFormContainer = document.getElementById('umkmFormContainer');
    const adminNav = document.getElementById('adminNav');
    const loginNav = document.getElementById('loginNav');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    
    if (isLoggedIn) {
        umkmFormContainer.style.display = 'block';
        adminNav.style.display = 'block';
        loginNav.style.display = 'none';
        deleteButtons.forEach(btn => btn.style.display = 'flex');
    } else {
        umkmFormContainer.style.display = 'none';
        adminNav.style.display = 'none';
        loginNav.style.display = 'block';
        deleteButtons.forEach(btn => btn.style.display = 'none');
    }
}

// Fungsi untuk menampilkan modal login
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

// Fungsi untuk menyembunyikan modal login
function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginForm').reset();
}

// Fungsi untuk login
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();

        if (data.success) {
            isLoggedIn = true;
            localStorage.setItem('isLoggedIn', 'true');
            await renderUMKMs(); // Render ulang dulu
            toggleAdminElements(); // Baru toggle elemen
            hideLoginModal();
            alert(data.message);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error login:', error);
        alert('Gagal terhubung ke server login.');
    }
}

// Fungsi untuk logout
async function logout() {
    isLoggedIn = false;
    localStorage.setItem('isLoggedIn', 'false');
    await renderUMKMs(); // Render ulang dulu
    toggleAdminElements(); // Baru toggle elemen
    alert('Anda telah logout.');
}

// --- Inisialisasi saat halaman dimuat ---
document.addEventListener('DOMContentLoaded', function() {
    
    // Render data awal
    renderUMKMs().then(() => {
        // Panggil toggleAdminElements setelah render selesai
        toggleAdminElements();
    });
    
    // Event listener untuk form login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Event listener untuk login link
    document.getElementById('loginLink').addEventListener('click', function(e) {
        e.preventDefault();
        showLoginModal();
    });
    
    // Event listener untuk logout link
    document.getElementById('logoutLink').addEventListener('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // Event listener untuk cancel login
    document.getElementById('cancelLogin').addEventListener('click', function() {
        hideLoginModal();
    });
    
    // Smooth scrolling (tetap sama)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target) {
                window.scrollTo({
                    top: target.offsetTop - 70, // -70 untuk offset header
                    behavior: 'smooth'
                });
            }
        });
    });
});