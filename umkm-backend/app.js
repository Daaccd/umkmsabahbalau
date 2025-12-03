const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
let globalUMKMs = [];

// --- FUNGSI BANTUAN: Convert Link Google Drive ---
function getDisplayImage(url) {
    if (!url) return null;

    // 1. Jika link lokal (Upload)
    if (url.includes('/uploads/')) {
        return url;
    }

    // 2. Jika link Google Drive
    // Mengubah format: drive.google.com/file/d/ID/view -> drive.google.com/uc?export=view&id=ID
    if (url.includes('drive.google.com') && url.includes('/d/')) {
        const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
        }
    }

    // 3. Link URL biasa
    return url;
}

// --- RENDER DATA ---
async function renderUMKMs() {
    const container = document.getElementById('umkmContainer');
    const visitorCountElement = document.getElementById('visitorCount');
    container.innerHTML = '';

    let umkms = [];
    let stats = { visits: 0, waClicks: {} };

    try {
        const [resUmkm, resStats] = await Promise.all([
            fetch(`${API_URL}/umkms`),
            fetch(`${API_URL}/stats`)
        ]);
        umkms = await resUmkm.json();
        stats = await resStats.json();
        globalUMKMs = umkms; // Simpan data untuk fitur Edit

        if(visitorCountElement) visitorCountElement.innerText = stats.visits || 0;
    } catch (error) {
        console.error('Gagal mengambil data:', error);
        container.innerHTML = '<p>Gagal memuat data.</p>';
        return;
    }
    
    if (umkms.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Belum ada UMKM.</p>';
        return;
    }

    umkms.forEach((umkm) => {
        const umkmCard = document.createElement('div');
        umkmCard.className = 'umkm-card';

        let adminButtons = '';
        if (isLoggedIn) {
            adminButtons = `
                <div class="admin-actions">
                    <button class="edit-btn" onclick="openEditModal('${umkm.id}')" title="Edit">✏️</button>
                    <button class="delete-btn" onclick="deleteUMKM('${umkm.id}')" title="Hapus">×</button>
                </div>
            `;
        }
        
        // Format Nomor WA
        let waNumber = umkm.phone.replace(/[^0-9]/g, ''); 
        if (waNumber.startsWith('0')) waNumber = '62' + waNumber.substring(1);

        const clickCount = (stats.waClicks && stats.waClicks[umkm.id]) ? stats.waClicks[umkm.id] : 0;
        
        // Ambil URL Gambar yang sudah diproses (Support Drive & Upload)
        const displayImage = getDisplayImage(umkm.image);
        const bgStyle = displayImage 
            ? `background-image: url('${displayImage}'); background-size: cover; background-position: center;` 
            : '';

        umkmCard.innerHTML = `
            ${adminButtons}
            <div class="umkm-img" style="${bgStyle}">
                ${!displayImage ? 'Foto UMKM' : ''}
            </div>
            <div class="umkm-info">
                <div style="display:flex; justify-content:space-between;">
                    <h3>${umkm.name}</h3>
                    <span class="click-badge">📱 ${clickCount}</span>
                </div>
                <p class="specialty">Spesialisasi: ${umkm.specialty}</p>
                <p>${umkm.description}</p>
                <div class="contact-info">
                    <p><strong>Alamat:</strong> ${umkm.address || 'N/A'}</p>
                    <p><strong>Kontak:</strong> ${umkm.phone}</p>
                    <div class="button-group">
                        <a href="${umkm.mapSrcUrl}" target="_blank" class="btn-small">Lihat Peta</a>
                        <a href="https://wa.me/${waNumber}" target="_blank" class="btn-small btn-whatsapp" onclick="trackWaClick('${umkm.id}')">Chat WA</a>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(umkmCard);
    });
}

// --- TRACKING ---
async function trackVisit() {
    try { await fetch(`${API_URL}/stats/visit`, { method: 'POST' }); } catch (e) {}
}
async function trackWaClick(id) {
    try { fetch(`${API_URL}/stats/wa-click/${id}`, { method: 'POST' }); } catch (e) {}
}

// --- CREATE (TAMBAH) ---
document.getElementById('umkmForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!isLoggedIn) return;

    const formData = new FormData();
    formData.append('name', document.getElementById('umkmName').value);
    formData.append('specialty', document.getElementById('umkmSpecialty').value);
    formData.append('description', document.getElementById('umkmDescription').value);
    formData.append('phone', document.getElementById('umkmPhone').value);
    formData.append('address', document.getElementById('umkmAddress').value);
    formData.append('mapSrcUrl', document.getElementById('umkmMapUrl').value);
    formData.append('imageUrl', document.getElementById('umkmImage').value); // URL Manual (Drive dll)

    const fileInput = document.getElementById('umkmFile');
    if (fileInput.files[0]) {
        formData.append('imageFile', fileInput.files[0]); // File Upload
    }

    try {
        const response = await fetch(`${API_URL}/umkms`, { method: 'POST', body: formData });
        if (response.ok) {
            renderUMKMs(); 
            this.reset();
            document.getElementById('umkmFile').value = ''; 
        } else { alert('Gagal menambah profil UMKM.'); }
    } catch (error) { console.error(error); }
});

// --- DELETE ---
async function deleteUMKM(id) {
    if(!confirm("Hapus UMKM ini?")) return;
    try {
        await fetch(`${API_URL}/umkms/${id}`, { method: 'DELETE' });
        renderUMKMs();
    } catch (error) { alert('Gagal menghapus'); }
}

// --- EDIT (UPDATE) ---
function openEditModal(id) {
    const umkm = globalUMKMs.find(u => u.id === id);
    if (!umkm) return;

    document.getElementById('editId').value = umkm.id;
    document.getElementById('editName').value = umkm.name;
    document.getElementById('editSpecialty').value = umkm.specialty;
    document.getElementById('editDescription').value = umkm.description;
    document.getElementById('editPhone').value = umkm.phone;
    document.getElementById('editAddress').value = umkm.address;
    document.getElementById('editMapUrl').value = umkm.mapSrcUrl;
    
    // Tampilkan URL lama di field text (jika itu URL, bukan file upload)
    document.getElementById('editImage').value = umkm.image || '';
    document.getElementById('editFile').value = ''; // Reset input file

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Submit Edit (PENTING: Menggunakan FormData agar bisa upload file baru saat edit)
document.getElementById('editForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const formData = new FormData();

    formData.append('name', document.getElementById('editName').value);
    formData.append('specialty', document.getElementById('editSpecialty').value);
    formData.append('description', document.getElementById('editDescription').value);
    formData.append('phone', document.getElementById('editPhone').value);
    formData.append('address', document.getElementById('editAddress').value);
    formData.append('mapSrcUrl', document.getElementById('editMapUrl').value);
    formData.append('imageUrl', document.getElementById('editImage').value);

    // Cek apakah ada file baru yang dipilih
    const fileInput = document.getElementById('editFile');
    if (fileInput.files[0]) {
        formData.append('imageFile', fileInput.files[0]);
    }

    try {
        const response = await fetch(`${API_URL}/umkms/${id}`, {
            method: 'PUT',
            body: formData // Jangan set Content-Type header manual
        });

        if (response.ok) {
            alert('Berhasil diperbarui!');
            closeEditModal();
            renderUMKMs(); 
        } else {
            alert('Gagal memperbarui data.');
        }
    } catch (error) {
        console.error('Error update:', error);
    }
});


// --- LOGIN / LOGOUT ---
function toggleAdminElements() {
    const umkmFormContainer = document.getElementById('umkmFormContainer');
    const adminNav = document.getElementById('adminNav');
    const loginNav = document.getElementById('loginNav');
    
    if (isLoggedIn) {
        umkmFormContainer.style.display = 'block';
        adminNav.style.display = 'block';
        loginNav.style.display = 'none';
    } else {
        umkmFormContainer.style.display = 'none';
        adminNav.style.display = 'none';
        loginNav.style.display = 'block';
    }
    renderUMKMs();
}

function showLoginModal() { document.getElementById('loginModal').style.display = 'flex'; }
function hideLoginModal() { document.getElementById('loginModal').style.display = 'none'; }

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
            toggleAdminElements(); 
            hideLoginModal();
            alert(data.message);
        } else {
            alert(data.message);
        }
    } catch (error) { alert('Gagal login'); }
}

function logout() {
    isLoggedIn = false;
    localStorage.setItem('isLoggedIn', 'false');
    toggleAdminElements(); 
    alert('Logout berhasil.');
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', function() {
    trackVisit();
    renderUMKMs().then(() => {
        if(isLoggedIn) toggleAdminElements();
    });
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('loginLink').addEventListener('click', (e) => { e.preventDefault(); showLoginModal(); });
    document.getElementById('logoutLink').addEventListener('click', (e) => { e.preventDefault(); logout(); });
    document.getElementById('cancelLogin').addEventListener('click', hideLoginModal);
});