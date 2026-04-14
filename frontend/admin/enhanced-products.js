// Enhanced Products Management JavaScript
let products = [];
let selectedProducts = new Set();
let editingProductId = null;
let branches = [];
let pagination = {};

const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadBranches();
    loadProductAnalytics();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('search-products')?.addEventListener('input', debounce(loadProducts, 300));
    
    // Select all checkbox
    document.getElementById('select-all-products')?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        
        if (e.target.checked) {
            products.forEach(p => selectedProducts.add(p.id));
        } else {
            selectedProducts.clear();
        }
        updateBulkActionButton();
    });
    
    // Product form submission
    document.getElementById('product-form')?.addEventListener('submit', saveProduct);
    
    // Image upload
    document.getElementById('image-upload')?.addEventListener('change', handleImageUpload);
    
    // Bulk action type change
    document.getElementById('bulk-action-type')?.addEventListener('change', (e) => {
        const valueContainer = document.getElementById('bulk-action-value-container');
        const valueInput = document.getElementById('bulk-action-value');
        
        if (e.target.value === 'delete') {
            valueContainer.style.display = 'none';
        } else {
            valueContainer.style.display = 'block';
            valueInput.type = e.target.value === 'price' || e.target.value === 'stock' ? 'number' : 'text';
            valueInput.placeholder = getPlaceholderForAction(e.target.value);
        }
    });
}

// Load Products
async function loadProducts() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const search = document.getElementById('search-products')?.value || '';
        const status = document.getElementById('filter-status')?.value || '';
        const category = document.getElementById('filter-category')?.value || '';
        const branch = document.getElementById('filter-branch')?.value || '';
        const page = document.getElementById('current-page')?.value || 1;
        
        const params = new URLSearchParams({ search, status, category, branch, page, limit: 50 });
        const response = await fetch(`${apiBase}/admin/products/enhanced?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load products');
        
        const data = await response.json();
        products = data.products || data; // Handle both response formats
        pagination = data.pagination || {};
        renderProducts();
        updateCategoryFilter();
        updatePagination();
    } catch (error) {
        console.error('Error loading products:', error);
        window.showToast('Failed to load products', 'error');
    }
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
        updateBranchFilter();
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

// Load Product Analytics
async function loadProductAnalytics() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/products/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load analytics');
        
        const analytics = await response.json();
        updateAnalyticsCards(analytics);
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Update Analytics Cards
function updateAnalyticsCards(analytics) {
    document.getElementById('stat-total-products').textContent = analytics.summary.total_products || 0;
    document.getElementById('stat-active-products').textContent = analytics.summary.active_products || 0;
    document.getElementById('stat-low-stock').textContent = analytics.summary.low_stock_products || 0;
    document.getElementById('stat-out-of-stock').textContent = analytics.summary.out_of_stock_products || 0;
}

// Render Products
function renderProducts() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-500">No products found.</td></tr>';
        return;
    }
    
    tbody.innerHTML = products.map(product => `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="p-4">
                <input type="checkbox" class="product-checkbox rounded border-white/20" 
                    data-id="${product.id}" 
                    ${selectedProducts.has(product.id) ? 'checked' : ''}
                    onchange="toggleProductSelection(${product.id})">
            </td>
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg bg-gray-700 overflow-hidden">
                        ${product.image_url ? `<img src="${normalizeImageUrl(product.image_url)}" onerror="this.onerror=null;this.src='/public/images/space-bg.png'" class="w-full h-full object-cover">` : '<div class="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-gray-400">N/A</div>'}
                    </div>
                    <div>
                        <p class="font-medium text-white">${product.name}</p>
                        <p class="text-xs text-gray-500">${product.description ? product.description.substring(0, 50) + '...' : 'No description'}</p>
                    </div>
                </div>
            </td>
            <td class="p-4 font-mono text-gray-400">${product.sku || 'N/A'}</td>
            <td class="p-4">
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500">
                    ${product.category || 'Uncategorized'}
                </span>
            </td>
            <td class="p-4 font-bold text-green-400">INR ${Number(product.price || 0).toFixed(2)}</td>
            <td class="p-4">
                <div class="flex items-center gap-2">
                    <span class="font-mono ${product.stock <= (product.low_stock_threshold || 5) ? 'text-red-400' : 'text-white'}">
                        ${product.stock || 0}
                    </span>
                    ${product.low_stock ? '<i data-lucide="alert-triangle" class="w-4 h-4 text-yellow-500"></i>' : ''}
                </div>
            </td>
            <td class="p-4 text-gray-400">${product.branches ? product.branches.join(', ') : 'Main'}</td>
            <td class="p-4">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(product.status)}">
                    ${product.status || 'active'}
                </span>
            </td>
            <td class="p-4 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="editProduct(${product.id})" class="text-blue-400 hover:text-blue-300 text-sm font-medium">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteProduct(${product.id})" class="text-red-400 hover:text-red-300 text-sm font-medium">
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
        'inactive': 'bg-red-500/10 text-red-500',
        'pending': 'bg-yellow-500/10 text-yellow-500'
    };
    return statusClasses[status] || statusClasses['active'];
}

// Toggle Product Selection
function toggleProductSelection(productId) {
    if (selectedProducts.has(productId)) {
        selectedProducts.delete(productId);
    } else {
        selectedProducts.add(productId);
    }
    updateBulkActionButton();
}

// Update Bulk Action Button
function updateBulkActionButton() {
    const button = document.querySelector('button[onclick="openBulkActionsModal()"]');
    if (button) {
        button.disabled = selectedProducts.size === 0;
        button.textContent = selectedProducts.size > 0 ? `Bulk Actions (${selectedProducts.size})` : 'Bulk Actions';
    }
}

// Update Category Filter
function updateCategoryFilter() {
    const select = document.getElementById('filter-category');
    if (!select) return;
    
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">All Categories</option>' + 
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    select.value = currentValue;
}

// Update Branch Filter
function updateBranchFilter() {
    const select = document.getElementById('filter-branch');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">All Branches</option>' + 
        branches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('');
    select.value = currentValue;
    
    // Also update product modal branch select
    const modalSelect = document.querySelector('select[name="branch"]');
    if (modalSelect) {
        modalSelect.innerHTML = '<option value="">Select branch</option>' + 
            branches.map(branch => `<option value="${branch.id}">${branch.name}</option>`).join('');
    }
}

// Open Product Modal
function openProductModal(productId = null) {
    editingProductId = productId;
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');
    
    if (productId) {
        title.textContent = 'Edit Product';
        const product = products.find(p => p.id === productId);
        if (product) {
            form.name.value = product.name || '';
            form.sku.value = product.sku || '';
            form.category.value = product.category || '';
            form.branch.value = product.branch || '';
            form.price.value = product.price || '';
            form.stock.value = product.stock || '';
            form.low_stock_threshold.value = product.low_stock_threshold || 5;
            form.status.value = product.status || 'active';
            form.weight.value = product.weight || '';
            form.dimensions.value = product.dimensions || '';
            form.description.value = product.description || '';
            form.tags.value = product.tags || '';
            form.meta_title.value = product.meta_title || '';
            form.meta_description.value = product.meta_description || '';
            form.meta_keywords.value = product.meta_keywords || '';
            form.image_url.value = product.image_url || '';
            
            // Show image preview
            if (product.image_url) {
                const preview = document.getElementById('image-preview');
                const container = document.getElementById('image-preview-container');
                preview.src = normalizeImageUrl(product.image_url);
                container.classList.remove('hidden');
            }
        }
    } else {
        title.textContent = 'Add Product';
        form.reset();
        document.getElementById('image-preview-container').classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
}

// Close Product Modal
function closeProductModal() {
    document.getElementById('product-modal').classList.add('hidden');
    editingProductId = null;
}

// Save Product
async function saveProduct(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    const form = event.target;
    const formData = new FormData(form);
    const productData = Object.fromEntries(formData.entries());
    
    try {
        const url = editingProductId 
            ? `${apiBase}/admin/products/enhanced/${editingProductId}`
            : `${apiBase}/admin/products/enhanced`;
        const method = editingProductId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) throw new Error('Failed to save product');
        
        window.showToast(editingProductId ? 'Product updated successfully' : 'Product created successfully', 'success');
        closeProductModal();
        loadProducts();
        loadProductAnalytics();
    } catch (error) {
        console.error('Error saving product:', error);
        window.showToast(error.message || 'Failed to save product', 'error');
    }
}

// Edit Product
function editProduct(productId) {
    openProductModal(productId);
}

// Delete Product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete product');
        
        window.showToast('Product deleted successfully', 'success');
        loadProducts();
        loadProductAnalytics();
    } catch (error) {
        console.error('Error deleting product:', error);
        window.showToast(error.message || 'Failed to delete product', 'error');
    }
}

// Handle Image Upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('image-preview');
        const container = document.getElementById('image-preview-container');
        preview.src = e.target.result;
        container.classList.remove('hidden');
        
        // Store the image data (in production, upload to server)
        document.querySelector('input[name="image_url"]').value = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Bulk Actions
function openBulkActionsModal() {
    if (selectedProducts.size === 0) {
        window.showToast('Please select products first', 'warning');
        return;
    }
    
    document.getElementById('bulk-actions-modal').classList.remove('hidden');
}

function closeBulkActionsModal() {
    document.getElementById('bulk-actions-modal').classList.add('hidden');
}

async function executeBulkAction() {
    const actionType = document.getElementById('bulk-action-type').value;
    const actionValue = document.getElementById('bulk-action-value').value;
    
    if (!actionType) {
        window.showToast('Please select an action', 'warning');
        return;
    }
    
    if (actionType !== 'delete' && !actionValue) {
        window.showToast('Please provide a value', 'warning');
        return;
    }
    
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        let url, payload;
        
        if (actionType === 'delete') {
            url = `${apiBase}/admin/products/bulk-delete`;
            payload = { productIds: Array.from(selectedProducts) };
        } else {
            url = `${apiBase}/admin/products/bulk-update`;
            payload = {
                updates: Array.from(selectedProducts).map(id => ({
                    id,
                    field: actionType,
                    value: actionType === 'price' || actionType === 'stock' ? parseFloat(actionValue) : actionValue
                }))
            };
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Failed to execute bulk action');
        
        window.showToast('Bulk action completed successfully', 'success');
        closeBulkActionsModal();
        selectedProducts.clear();
        loadProducts();
        loadProductAnalytics();
    } catch (error) {
        console.error('Error executing bulk action:', error);
        window.showToast(error.message || 'Failed to execute bulk action', 'error');
    }
}

// Export Products
async function exportProducts() {
    const token = localStorage.getItem('tt_token');
    if (!token) return;
    
    try {
        const response = await fetch(`${apiBase}/admin/products/export`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to export products');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        window.showToast('Products exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting products:', error);
        window.showToast(error.message || 'Failed to export products', 'error');
    }
}

// Utility Functions
function normalizeImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return url.startsWith('/') ? `${apiBase.replace('/api', '')}${url}` : `${apiBase.replace('/api', '')}/${url}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Update Pagination
function updatePagination() {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer || !pagination.page) return;
    
    const { page, pages, total } = pagination;
    const currentPage = parseInt(page);
    const totalPages = parseInt(pages);
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button onclick="changePage(${currentPage - 1})" 
                class="px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}" 
                ${currentPage === 1 ? 'disabled' : ''}>
            Previous
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" 
                    class="px-3 py-1 rounded mx-1 ${i === currentPage ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'}">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" 
                class="px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}" 
                ${currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
    `;
    
    // Info
    paginationHTML += `
        <span class="ml-4 text-sm text-gray-400">
            Page ${currentPage} of ${totalPages} (${total} total products)
        </span>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 1 || page > pagination.pages) return;
    document.getElementById('current-page').value = page;
    loadProducts();
}

function getPlaceholderForAction(action) {
    const placeholders = {
        'status': 'active or inactive',
        'category': 'Electronics, Software, etc.',
        'price': '99.99',
        'stock': '100'
    };
    return placeholders[action] || 'Enter value';
}
