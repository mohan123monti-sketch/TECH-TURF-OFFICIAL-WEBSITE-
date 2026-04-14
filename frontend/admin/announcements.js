let allAnnouncements = [];
let editingAnnouncementId = null;
const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

async function loadAnnouncements() {
    const token = window.getAuthToken?.() || localStorage.getItem('tt_token') || localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${apiBase}/announcements`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('Failed to load announcements');
            return;
        }

        const data = await response.json();
        allAnnouncements = Array.isArray(data) ? data : (data.announcements || data.items || []);
        filterAnnouncements();

    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

function filterAnnouncements() {
    const statusFilter = document.getElementById('filter-status').value;

    let filtered = allAnnouncements;
    if (statusFilter) {
        filtered = allAnnouncements.filter(a => a.status === statusFilter);
    }

    renderAnnouncements(filtered);
}

function renderAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');

    if (!announcements || announcements.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i data-lucide="megaphone" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                <p>No announcements found</p>
            </div>
        `;
        return;
    }

    const typeColors = {
        info: 'border-blue-500/30 bg-blue-500/5',
        warning: 'border-yellow-500/30 bg-yellow-500/5',
        success: 'border-green-500/30 bg-green-500/5',
        error: 'border-red-500/30 bg-red-500/5',
        maintenance: 'border-purple-500/30 bg-purple-500/5'
    };

    const priorityColors = {
        low: 'text-gray-400 bg-gray-500/10',
        medium: 'text-yellow-400 bg-yellow-500/10',
        high: 'text-orange-400 bg-orange-500/10',
        critical: 'text-red-400 bg-red-500/10'
    };

    const statusColors = {
        active: 'text-green-400 bg-green-500/10',
        scheduled: 'text-blue-400 bg-blue-500/10',
        archived: 'text-gray-400 bg-gray-500/10'
    };

    container.innerHTML = announcements.map(announcement => {
        const typeColor = typeColors[announcement.type] || typeColors.info;
        const priorityClass = priorityColors[announcement.priority] || priorityColors.medium;
        const statusClass = statusColors[announcement.status] || statusColors.active;
        const announcementId = announcement._id || announcement.id;

        return `
            <div class="iphone-glass border ${typeColor} rounded-[2rem] p-6 hover:border-white/20 transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <h3 class="text-lg font-black text-white">${announcement.title}</h3>
                            <span class="text-xs px-2 py-1 rounded ${priorityClass}">
                                ${announcement.priority?.toUpperCase() || 'MEDIUM'}
                            </span>
                            <span class="text-xs px-2 py-1 rounded ${statusClass}">
                                ${announcement.status?.toUpperCase() || 'ACTIVE'}
                            </span>
                        </div>
                        <p class="text-gray-400 text-sm line-clamp-2 mb-3">${announcement.content}</p>
                        <div class="flex items-center gap-4 text-xs text-gray-500">
                            <div class="flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3 h-3"></i>
                                ${new Date(announcement.createdAt || announcement.created_at).toLocaleDateString()}
                            </div>
                            ${announcement.startDate ? `
                                <div class="flex items-center gap-1">
                                    <i data-lucide="clock" class="w-3 h-3"></i>
                                    ${new Date(announcement.startDate).toLocaleString()}
                                </div>
                            ` : ''}
                            ${announcement.viewCount !== undefined ? `
                                <div class="flex items-center gap-1">
                                    <i data-lucide="eye" class="w-3 h-3"></i>
                                    ${announcement.viewCount} views
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editAnnouncement('${announcementId}')"
                            class="p-2 hover:bg-white/10 rounded-lg transition-all">
                            <i data-lucide="edit" class="w-5 h-5 text-blue-400"></i>
                        </button>
                        <button onclick="deleteAnnouncement('${announcementId}')"
                            class="p-2 hover:bg-white/10 rounded-lg transition-all">
                            <i data-lucide="trash-2" class="w-5 h-5 text-red-400"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function openCreateModal() {
    editingAnnouncementId = null;
    document.getElementById('modal-title').textContent = 'New Announcement';
    document.getElementById('announcement-form').reset();
    const priorityField = document.getElementById('announcement-priority');
    if (priorityField) priorityField.value = 'medium';
        const notifyUsersField = document.getElementById('notify-users');
        if (notifyUsersField) notifyUsersField.checked = true;
    document.getElementById('announcement-modal').classList.remove('hidden');
}

function closeCreateModal() {
    document.getElementById('announcement-modal').classList.add('hidden');
    document.getElementById('announcement-form').reset();
    editingAnnouncementId = null;
}

async function editAnnouncement(announcementId) {
    const announcement = allAnnouncements.find(a => String(a._id || a.id) === String(announcementId));
    if (!announcement) return;

    editingAnnouncementId = announcementId;
    document.getElementById('modal-title').textContent = 'Edit Announcement';
    document.getElementById('announcement-title').value = announcement.title;
    document.getElementById('announcement-content').value = announcement.content;
    document.getElementById('announcement-type').value = announcement.type || 'info';
    const priorityField = document.getElementById('announcement-priority');
    if (priorityField) priorityField.value = announcement.priority || 'medium';
    const notifyUsersField = document.getElementById('notify-users');
        if (notifyUsersField) notifyUsersField.checked = announcement.status ? announcement.status !== 'archived' : announcement.notifyUsers !== false;

    if (announcement.startDate) {
        document.getElementById('start-datetime').value = new Date(announcement.startDate).toISOString().slice(0, 16);
    }
    if (announcement.endDate) {
        document.getElementById('end-datetime').value = new Date(announcement.endDate).toISOString().slice(0, 16);
    }

    document.getElementById('announcement-modal').classList.remove('hidden');
}

document.getElementById('announcement-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = window.getAuthToken?.() || localStorage.getItem('tt_token') || localStorage.getItem('token');
    if (!token) return;

    const announcementData = {
        title: document.getElementById('announcement-title').value,
        content: document.getElementById('announcement-content').value,
        type: document.getElementById('announcement-type').value,
        priority: document.getElementById('announcement-priority')?.value || 'medium',
        notifyUsers: document.getElementById('notify-users')?.checked ?? true,
            status: document.getElementById('notify-users')?.checked ? 'active' : 'archived',
        startDate: document.getElementById('start-datetime').value ? new Date(document.getElementById('start-datetime').value) : null,
        endDate: document.getElementById('end-datetime').value ? new Date(document.getElementById('end-datetime').value) : null
    };

    try {
        let response;
        if (editingAnnouncementId) {
            // Update existing
            response = await fetch(`${apiBase}/announcements/${editingAnnouncementId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(announcementData)
            });
        } else {
            // Create new
            response = await fetch(`${apiBase}/announcements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(announcementData)
            });
        }

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to save announcement');
        }

        window.showMessage?.('success', editingAnnouncementId ? 'Announcement updated' : 'Announcement created');
        closeCreateModal();
        loadAnnouncements();

    } catch (error) {
        console.error('Error saving announcement:', error);
        window.showMessage?.('error', error.message || 'Failed to save announcement');
    }
});

async function deleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    const token = window.getAuthToken?.();
    if (!token) return;

    try {
        const response = await fetch(`${apiBase}/announcements/${announcementId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Delete failed');

        window.showMessage?.('success', 'Announcement deleted');
        loadAnnouncements();

    } catch (error) {
        console.error('Error deleting announcement:', error);
        window.showMessage?.('error', 'Failed to delete announcement');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    loadAnnouncements();

    // Refresh announcements every 30 seconds
    setInterval(loadAnnouncements, 30000);
});
