// Users Page Logic
// Note: API_BASE_URL and window.showToast are provided by admin-layout.js

let users = [];

async function loadUsers() {
    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        users = await response.json();
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        window.showToast('Failed to load users', 'error');
    }
}

function renderUsers() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const roleColors = {
            superadmin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            admin: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
            product_manager: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
            content_manager: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
            support_agent: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
            user: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        };

        const roleDisplay = user.role?.replace(/_/g, ' ') || 'user';

        return `
            <tr class="hover:bg-gray-700/30 transition-colors">
                <td class="p-4 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">
                        ${user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div class="font-medium">${user.name || 'N/A'}</div>
                        <div class="text-xs text-gray-500">${user.email}</div>
                    </div>
                </td>
                <td class="p-4">
                    <span class="px-3 py-1 text-xs font-semibold rounded-full border ${roleColors[user.role] || roleColors['user']}">
                        ${roleDisplay.charAt(0).toUpperCase() + roleDisplay.slice(1)}
                    </span>
                </td>
                <td class="p-4 text-gray-400">${new Date(user.created_at).toLocaleDateString()}</td>
                <td class="p-4 text-right">
                    <button onclick="editUser('${user.id}')" class="text-blue-400 hover:text-blue-300">
                        <i data-lucide="user-cog" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function openInviteModal() {
    const modal = document.getElementById('invite-modal');
    const form = document.getElementById('invite-form');
    form.reset();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeInviteModal() {
    const modal = document.getElementById('invite-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function updateUserRole(userId, role) {
    const token = localStorage.getItem('tt_token');
    try {
        // Assume an endpoint exists to update user roles by an admin
        const response = await fetch(`${window.API_BASE_URL}/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: role })
        });

        if (response.ok) {
            window.showToast(`Role for user updated to ${role}`, 'success');
        } else {
            const errorData = await response.json();
            console.error('Error updating role:', errorData);
            window.showToast(errorData.message || 'Error updating user role', 'error');
        }
    } catch (error) {
        console.error('Network error updating role:', error);
        window.showToast('Network error updating role', 'error');
    }
}

async function inviteUser(event) {
    event.preventDefault();
    // We do not require admin token for the initial 'register' call, only for role update later.
    const form = event.target;

    const userData = {
        name: form.username.value,
        email: form.email.value,
        password: form.password.value,
        role: form.role.value
    };

    try {
        // Use the register endpoint for invitation
        const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            const data = await response.json();
            // If the role is not 'user', try to update it via an admin endpoint
            if (userData.role !== 'user') {
                // The `data.user.id` is the new user's ID returned by the register endpoint
                await updateUserRole(data.user.id, userData.role);
            }

            window.showToast('User invited successfully', 'success');
            closeInviteModal();
            loadUsers();
        } else {
            // Improved Error Handling: Parse server response for specific message
            try {
                const errorData = await response.json();
                window.showToast(errorData.message || 'Error inviting user', 'error');
            } catch (e) {
                window.showToast('Error inviting user (Unknown response format)', 'error');
            }
        }
    } catch (error) {
        console.error('Error inviting user:', error);
        window.showToast('Network error inviting user', 'error');
    }
}

// Mock function for editing user (would open a modal, for now just logs)
function editUser(id) {
    console.info(`[ACTION] Placeholder for editing user ID: ${id}.`);
    window.showToast(`Edit user feature is a placeholder. User ID ${id} details are in the console.`, 'info');
}

document.addEventListener('DOMContentLoaded', loadUsers);