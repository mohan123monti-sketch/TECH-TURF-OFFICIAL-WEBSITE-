// Branch Management JavaScript
let branches = [];
let editingBranchId = null;

const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadBranches();
    loadBranchStats();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('branch-form')?.addEventListener('submit', saveBranch);
}

// Load Branches
async function loadBranches() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/branches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load branches');
        
        branches = await response.json();
        renderBranches();
    } catch (error) {
        console.error('Error loading branches:', error);
        window.showToast(error.message || 'Failed to load branches', 'error');
    }
}

// Load Branch Stats
async function loadBranchStats() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        // Load low stock alerts
        const alertsResponse = await fetch(`${apiBase}/admin/branches/low-stock-alerts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (alertsResponse.ok) {
            const alerts = await alertsResponse.json();
            document.getElementById('stat-low-stock-items').textContent = alerts.length;
        }
        
        // Calculate other stats
        const totalBranches = branches.length;
        const activeBranches = branches.filter(b => b.status === 'active').length;
        
        document.getElementById('stat-total-branches').textContent = totalBranches;
        document.getElementById('stat-active-branches').textContent = activeBranches;
        document.getElementById('stat-inventory-value').textContent = 'INR 2.5M'; // Estimate
        
    } catch (error) {
        console.error('Error loading branch stats:', error);
    }
}

// Render Branches
function renderBranches() {
    const tbody = document.getElementById('branches-tbody');
    if (!tbody) return;
    
    if (branches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500">No branches found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = branches.map(branch => `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <i data-lucide="building-2" class="w-5 h-5 text-blue-500"></i>
                    </div>
                    <div>
                        <p class="font-medium text-white">${branch.name}</p>
                        <p class="text-xs text-gray-400">${branch.address || 'No address'}</p>
                    </div>
                </div>
            </td>
            <td class="p-4">
                <p class="text-sm text-white">${branch.manager_name || 'Not assigned'}</p>
            </td>
            <td class="p-4">
                <p class="text-sm text-gray-400">${branch.phone || 'N/A'}</p>
                <p class="text-xs text-gray-500">${branch.email || 'N/A'}</p>
            </td>
            <td class="p-4">
                <p class="text-sm text-white">0</p>
                <p class="text-xs text-gray-400">Products</p>
            </td>
            <td class="p-4">
                <p class="text-sm text-white">0</p>
                <p class="text-xs text-gray-400">Total stock</p>
            </td>
            <td class="p-4">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(branch.status)}">
                    ${branch.status || 'active'}
                </span>
            </td>
            <td class="p-4 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="editBranch(${branch.id})" class="text-blue-400 hover:text-blue-300 text-sm font-medium">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteBranch(${branch.id})" class="text-red-400 hover:text-red-300 text-sm font-medium">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
}

// Get Status Class
function getStatusClass(status) {
    const statusClasses = {
        'active': 'bg-green-500/10 text-green-500',
        'inactive': 'bg-red-500/10 text-red-500'
    };
    return statusClasses[status] || statusClasses['active'];
}

// Open Branch Modal
function openBranchModal(branchId = null) {
    editingBranchId = branchId;
    const modal = document.getElementById('branch-modal');
    const form = document.getElementById('branch-form');
    const title = document.getElementById('modal-title');
    
    if (branchId) {
        title.textContent = 'Edit Branch';
        const branch = branches.find(b => b.id === branchId);
        if (branch) {
            form.name.value = branch.name || '';
            form.address.value = branch.address || '';
            form.phone.value = branch.phone || '';
            form.email.value = branch.email || '';
            form.status.value = branch.status || 'active';
        }
    } else {
        title.textContent = 'Add Branch';
        form.reset();
    }
    
    modal.classList.remove('hidden');
}

// Close Branch Modal
function closeBranchModal() {
    document.getElementById('branch-modal').classList.add('hidden');
    editingBranchId = null;
}

// Save Branch
async function saveBranch(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    const form = event.target;
    const formData = new FormData(form);
    const branchData = Object.fromEntries(formData.entries());
    
    try {
        const url = editingBranchId 
            ? `${apiBase}/admin/branches/${editingBranchId}`
            : `${apiBase}/admin/branches`;
        const method = editingBranchId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(branchData)
        });
        
        if (!response.ok) throw new Error('Failed to save branch');
        
        window.showToast(editingBranchId ? 'Branch updated successfully' : 'Branch created successfully', 'success');
        closeBranchModal();
        loadBranches();
        loadBranchStats();
    } catch (error) {
        console.error('Error saving branch:', error);
        window.showToast(error.message || 'Failed to save branch', 'error');
    }
}

// Edit Branch
function editBranch(branchId) {
    openBranchModal(branchId);
}

// Delete Branch
async function deleteBranch(branchId) {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/branches/${branchId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete branch');
        
        window.showToast('Branch deleted successfully', 'success');
        loadBranches();
        loadBranchStats();
    } catch (error) {
        console.error('Error deleting branch:', error);
        window.showToast(error.message || 'Failed to delete branch', 'error');
    }
}
