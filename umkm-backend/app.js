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

// --- ▼▼▼ TAMBAHKAN LOGIKA INI ▼▼▼ ---
        let mapButton = '';
        // Periksa apakah umkm.mapSrcUrl ada dan tidak kosong
        if (umkm.mapSrcUrl) {
            // Buat tombol sebagai link (tag <a>) yang membuka tab baru
            mapButton = `<a href="${umkm.mapSrcUrl}" target="_blank" class="btn-small btn-map">📍 Lihat Peta</a>`;
        }
        // --- ▲▲▲ AKHIR TAMBAHAN BARU ▲▲▲ ---

        umkmCard.innerHTML = `
            <div class="umkm-img" style="${umkm.image ? `background-image: url('${umkm.image}'); background-size: cover;` : ''}">
                ${!umkm.image ? 'Foto UMKM' : ''}
            </div>
            <div class="umkm-info">
                <h3>${umkm.name}</h3>
                <p class="specialty">Spesialisasi: ${umkm.specialty}</p>
                <p>${umkm.description}</p>
                <div class="contact-info">
                    <p>📞 ${umkm.phone}</p>
                    <p>✉️ ${umkm.email}</p>
                    <p>${mapButton}</p>
                </div>
            </div>
            ${deleteButton}
        `;
        container.appendChild(umkmCard);
    });
}

// --- FUNGSI AKSI (TAMBAH, HAPUS, LOGIN) ---

// Fungsi untuk menambah produk DIHAPUS

// Fungsi untuk menambah UMKM


// Fungsi untuk menghapus produk DIHAPUS

// Fungsi untuk menghapus UMKM (sekarang pakai ID)
async function deleteUMKM(id) {
    if (!isLoggedIn) return;
    if (!confirm('Apakah Anda yakin ingin menghapus UMKM ini?')) return;
    
    try {
        const response = await fetch(`${API_URL}/umkms/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            renderUMKMs(); // Refresh daftar UMKM
        } else {
            alert('Gagal menghapus UMKM.');
        }
    } catch (error) {
        console.error('Error menghapus UMKM:', error);
    }
}

// --- FUNGSI LOGIN / LOGOUT ---

// Fungsi untuk login


// Fungsi untuk logout
function logout() {
    isLoggedIn = false;
    localStorage.setItem('isLoggedIn', 'false');
    toggleAdminElements();
    // renderProducts(); // Dihapus
    renderUMKMs();   // Render ulang untuk sembunyikan tombol delete
    alert('Anda telah logout.');
}

// --- FUNGSI UTILITAS (TIDAK BERUBAH BANYAK) ---

// Fungsi untuk menampilkan atau menyembunyikan elemen admin
function toggleAdminElements() {
    // const productFormContainer = document.getElementById('productFormContainer'); // Dihapus
    const umkmFormContainer = document.getElementById('umkmFormContainer');
    const adminNav = document.getElementById('adminNav');
    const loginNav = document.getElementById('loginNav');
    
    if (isLoggedIn) {
        // productFormContainer.style.display = 'block'; // Dihapus
        umkmFormContainer.style.display = 'block';
        adminNav.style.display = 'block';
        loginNav.style.display = 'none';
    } else {
        // productFormContainer.style.display = 'none'; // Dihapus
        umkmFormContainer.style.display = 'none';
        adminNav.style.display = 'none';
        loginNav.style.display = 'block';
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

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    toggleAdminElements();
    
    // Render data dari server
    // renderProducts(); // Dihapus
    renderUMKMs();

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
         image: document.getElementById('umkmImage').value || null,
         mapSrcUrl: document.getElementById('umkmMapUrl').value || null // <-- TAMBAHKAN BARIS INI
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
                alert('Gagal menambah UMKM.');
         }
        } catch (error) {
        console.error('Error menambah UMKM:', error);
        }
    });

      document.getElementById('loginForm').addEventListener('submit', async function(e) {
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
               toggleAdminElements();
            // renderProducts(); // Dihapus
               renderUMKMs();   // Render ulang untuk tampilkan tombol delete
              hideLoginModal();
              alert(data.message);
          } else {
              alert(data.message);
           }
       } catch (error) {
           console.error('Error login:', error);
           alert('Gagal terhubung ke server login.');
        }
    });
    
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