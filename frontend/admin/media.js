let allMedia = [];
let currentPreviewMedia = null;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

async function loadMedia() {
    const token = window.getAuthToken?.();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${window.API_BASE_URL || '/api'}/media`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('Failed to load media');
            return;
        }

        const { media } = await response.json();
        allMedia = media || [];
        renderMedia(allMedia);

    } catch (error) {
        console.error('Error loading media:', error);
    }
}

function renderMedia(mediaList) {
    const grid = document.getElementById('media-grid');

    if (!mediaList || mediaList.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <i data-lucide="image" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                <p>No media files found</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = mediaList.map(media => {
        const isImage = media.mimetype?.startsWith('image');
        const isVideo = media.mimetype?.startsWith('video');

        return `
            <div class="group relative bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all cursor-pointer"
                onclick="previewMedia('${media._id}')">
                <div class="aspect-square bg-black/20 flex items-center justify-center overflow-hidden">
                    ${isImage ? `<img src="${media.url}" alt="${media.filename}" class="w-full h-full object-cover">` : ''}
                    ${isVideo ? `
                        <div class="relative w-full h-full bg-black/50 flex items-center justify-center">
                            <i data-lucide="play" class="w-8 h-8 text-white"></i>
                            <video src="${media.url}" class="w-full h-full object-cover absolute inset-0 opacity-20"></video>
                        </div>
                    ` : ''}
                    ${!isImage && !isVideo ? `
                        <div class="text-center">
                            <i data-lucide="file" class="w-8 h-8 text-gray-400 mx-auto mb-2"></i>
                            <p class="text-xs text-gray-400">${media.mimetype?.split('/')[1] || 'file'}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <i data-lucide="eye" class="w-6 h-6 text-white"></i>
                </div>
                <div class="p-3">
                    <p class="text-xs font-semibold text-white truncate">${media.filename}</p>
                    <p class="text-xs text-gray-400">${formatFileSize(media.size)}</p>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

async function previewMedia(mediaId) {
    const media = allMedia.find(m => m._id === mediaId);
    if (!media) return;

    currentPreviewMedia = media;
    const modalContent = document.getElementById('preview-content');
    const isImage = media.mimetype?.startsWith('image');
    const isVideo = media.mimetype?.startsWith('video');

    if (isImage) {
        modalContent.innerHTML = `<img src="${media.url}" alt="${media.filename}" class="w-full h-auto">`;
    } else if (isVideo) {
        modalContent.innerHTML = `<video src="${media.url}" controls class="w-full h-auto" style="max-height: 70vh;"></video>`;
    } else {
        modalContent.innerHTML = `
            <div class="p-12 text-center">
                <i data-lucide="file" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
                <p class="text-white font-semibold mb-2">${media.filename}</p>
                <p class="text-gray-400 text-sm mb-6">${formatFileSize(media.size)}</p>
                <p class="text-gray-500 text-xs">${media.mimetype}</p>
            </div>
        `;
    }

    document.getElementById('preview-modal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closePreviewModal() {
    document.getElementById('preview-modal').classList.add('hidden');
    currentPreviewMedia = null;
}

function openUploadModal() {
    document.getElementById('upload-modal').classList.remove('hidden');
}

function closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    document.getElementById('upload-form').reset();
    document.getElementById('file-list').innerHTML = '';
}

// Drag & Drop functionality
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-white/40');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-white/40');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-white/40');
        handleFileSelect(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files);
    });
}

function handleFileSelect(files) {
    const fileList = document.getElementById('file-list');
    const fileArray = Array.from(files);

    const validFiles = fileArray.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
            window.showMessage?.('error', `${file.name} exceeds 50MB limit`);
            return false;
        }
        return true;
    });

    fileList.innerHTML = validFiles.map((file, i) => `
        <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div class="flex items-center gap-3 flex-1">
                <i data-lucide="file" class="w-4 h-4 text-gray-400"></i>
                <div class="flex-1">
                    <p class="text-sm text-white truncate">${file.name}</p>
                    <p class="text-xs text-gray-400">${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button type="button" onclick="removeFile(${i})"
                class="text-red-400 hover:text-red-300">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');

    // Store files for later upload
    fileInput.dataset.validFiles = JSON.stringify(validFiles.map(f => f.name));
    if (window.lucide) lucide.createIcons();
}

function removeFile(index) {
    // File removal logic can be enhanced
    const fileList = document.getElementById('file-list');
    const items = fileList.querySelectorAll('div');
    if (items[index]) items[index].remove();
}

document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = window.getAuthToken?.();
    if (!token) return;

    const files = document.getElementById('file-input').files;
    if (files.length === 0) {
        window.showMessage?.('error', 'Please select files to upload');
        return;
    }

    const formData = new FormData();
    Array.from(files).forEach(file => {
        formData.append('files', file);
    });
    formData.append('altText', document.getElementById('alt-text').value);
    formData.append('category', document.getElementById('media-category').value);

    try {
        const response = await fetch(`${window.API_BASE_URL || '/api'}/media/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        window.showMessage?.('success', 'Files uploaded successfully');
        closeUploadModal();
        loadMedia();

    } catch (error) {
        console.error('Upload error:', error);
        window.showMessage?.('error', 'Failed to upload files');
    }
});

async function deleteMedia() {
    if (!currentPreviewMedia) return;

    if (!confirm('Are you sure you want to delete this file?')) return;

    const token = window.getAuthToken?.();
    if (!token) return;

    try {
        const response = await fetch(`${window.API_BASE_URL || '/api'}/media/${currentPreviewMedia._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Delete failed');

        window.showMessage?.('success', 'Media deleted successfully');
        closePreviewModal();
        loadMedia();

    } catch (error) {
        console.error('Delete error:', error);
        window.showMessage?.('error', 'Failed to delete media');
    }
}

function copyMediaURL() {
    if (!currentPreviewMedia) return;

    const url = currentPreviewMedia.url;
    navigator.clipboard.writeText(url).then(() => {
        window.showMessage?.('success', 'URL copied to clipboard');
    });
}

function downloadMedia() {
    if (!currentPreviewMedia) return;

    const link = document.createElement('a');
    link.href = currentPreviewMedia.url;
    link.download = currentPreviewMedia.filename;
    link.click();
}

function filterMedia() {
    const searchTerm = document.getElementById('search-media').value.toLowerCase();
    const filterType = document.getElementById('filter-type').value;
    const sortBy = document.getElementById('sort-by').value;

    let filtered = allMedia.filter(media => {
        const matchesSearch = media.filename.toLowerCase().includes(searchTerm);
        const matchesType = !filterType || media.mimetype?.startsWith(filterType);
        return matchesSearch && matchesType;
    });

    // Sort
    if (sortBy === 'oldest') {
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'size') {
        filtered.sort((a, b) => a.size - b.size);
    } else if (sortBy === 'name') {
        filtered.sort((a, b) => a.filename.localeCompare(b.filename));
    } else {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderMedia(filtered);
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

document.getElementById('search-media')?.addEventListener('input', filterMedia);

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    loadMedia();

    // Refresh media every 60 seconds
    setInterval(loadMedia, 60000);
});
