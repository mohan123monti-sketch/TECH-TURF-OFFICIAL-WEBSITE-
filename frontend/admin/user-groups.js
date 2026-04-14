// User Groups Management JavaScript
let groups = [];
let editingGroupId = null;

const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadGroups();
    loadGroupStats();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('group-form')?.addEventListener('submit', saveGroup);
}

// Load Groups
async function loadGroups() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/user-groups`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load groups');
        
        groups = await response.json();
        renderGroups();
    } catch (error) {
        console.error('Error loading groups:', error);
        window.showToast(error.message || 'Failed to load groups', 'error');
    }
}

// Load Group Stats
async function loadGroupStats() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const totalGroups = groups.length;
        const activeGroups = groups.filter(g => g.status === 'active').length;
        const totalMembers = groups.reduce((sum, group) => sum + (group.member_count || 0), 0);
        
        document.getElementById('stat-total-groups').textContent = totalGroups;
        document.getElementById('stat-active-groups').textContent = activeGroups;
        document.getElementById('stat-total-members').textContent = totalMembers;
        
    } catch (error) {
        console.error('Error loading group stats:', error);
    }
}

// Render Groups
function renderGroups() {
    const tbody = document.getElementById('groups-tbody');
    if (!tbody) return;
    
    if (groups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">No groups found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = groups.map(group => {
        const permissions = group.permissions ? JSON.parse(group.permissions) : [];
        const permissionCount = permissions.length;
        
        return `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <i data-lucide="users-2" class="w-5 h-5 text-purple-500"></i>
                        </div>
                        <div>
                            <p class="font-medium text-white">${group.name}</p>
                            <p class="text-xs text-gray-400">${group.status || 'active'}</p>
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <p class="text-sm text-gray-300">${group.description || 'No description'}</p>
                </td>
                <td class="p-4">
                    <p class="text-sm text-white">${group.member_count || 0} members</p>
                </td>
                <td class="p-4">
                    <p class="text-sm text-blue-400">${permissionCount} permissions</p>
                    <p class="text-xs text-gray-500">Click to view</p>
                </td>
                <td class="p-4 text-right">
                    <div class="flex justify-end gap-2">
                        <button onclick="viewPermissions(${group.id})" class="text-blue-400 hover:text-blue-300 text-sm font-medium">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        <button onclick="editGroup(${group.id})" class="text-blue-400 hover:text-blue-300 text-sm font-medium">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteGroup(${group.id})" class="text-red-400 hover:text-red-300 text-sm font-medium">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
}

// Open Group Modal
function openGroupModal(groupId = null) {
    editingGroupId = groupId;
    const modal = document.getElementById('group-modal');
    const form = document.getElementById('group-form');
    const title = document.getElementById('modal-title');
    
    if (groupId) {
        title.textContent = 'Edit User Group';
        const group = groups.find(g => g.id === groupId);
        if (group) {
            form.name.value = group.name || '';
            form.description.value = group.description || '';
            form.status.value = group.status || 'active';
            
            // Set permissions checkboxes
            const permissions = group.permissions ? JSON.parse(group.permissions) : [];
            const checkboxes = form.querySelectorAll('input[name="permissions"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = permissions.includes(checkbox.value);
            });
        }
    } else {
        title.textContent = 'Create User Group';
        form.reset();
    }
    
    modal.classList.remove('hidden');
}

// Close Group Modal
function closeGroupModal() {
    document.getElementById('group-modal').classList.add('hidden');
    editingGroupId = null;
}

// Save Group
async function saveGroup(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Get checked permissions
    const permissions = Array.from(form.querySelectorAll('input[name="permissions"]:checked'))
        .map(checkbox => checkbox.value);
    
    const groupData = {
        name: formData.get('name'),
        description: formData.get('description'),
        status: formData.get('status'),
        permissions: JSON.stringify(permissions)
    };
    
    try {
        const url = editingGroupId 
            ? `${apiBase}/admin/user-groups/${editingGroupId}`
            : `${apiBase}/admin/user-groups`;
        const method = editingGroupId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(groupData)
        });
        
        if (!response.ok) throw new Error('Failed to save group');
        
        window.showToast(editingGroupId ? 'Group updated successfully' : 'Group created successfully', 'success');
        closeGroupModal();
        loadGroups();
        loadGroupStats();
    } catch (error) {
        console.error('Error saving group:', error);
        window.showToast(error.message || 'Failed to save group', 'error');
    }
}

// Edit Group
function editGroup(groupId) {
    openGroupModal(groupId);
}

// View Permissions
function viewPermissions(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    const permissions = group.permissions ? JSON.parse(group.permissions) : [];
    const permissionText = permissions.length > 0 ? permissions.join(', ') : 'No permissions';
    
    window.showToast(`${group.name} permissions: ${permissionText}`, 'info');
}

// Delete Group
async function deleteGroup(groupId) {
    if (!confirm('Are you sure you want to delete this group? This will remove all members from the group.')) return;
    
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/user-groups/${groupId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete group');
        
        window.showToast('Group deleted successfully', 'success');
        loadGroups();
        loadGroupStats();
    } catch (error) {
        console.error('Error deleting group:', error);
        window.showToast(error.message || 'Failed to delete group', 'error');
    }
}
