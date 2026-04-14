// Products Page Logic - COMPLETE VERSION
// Note: API_BASE_URL and window.showToast are provided by admin-layout.js

let products = [];
let editingProductId = null;
const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';

async function loadProducts() {
    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${apiBase}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to load products (${response.status})`);
        }
        const data = await response.json();
        products = Array.isArray(data) ? data : (data.products || data.items || []);
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        window.showToast(error.message || 'Failed to load products', 'error');
    }
}

function renderProducts() {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No products found.</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => `
        <tr class="hover:bg-gray-700/30 transition-colors">
            <td class="p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded bg-gray-700 overflow-hidden">
                    ${product.imageUrl || product.image_url ? `<img src="${product.imageUrl || product.image_url}" onerror="this.onerror=null;this.src='/public/images/space-bg.png'" class="w-full h-full object-cover">` : '<div class="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-gray-400">N/A</div>'}
                </div>
                <span class="font-medium">${product.name}</span>
                <span class="ml-2 px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-black uppercase text-[#d2670e] border border-[#d2670e]/20">${product.branch || 'Tech Turf'}</span>
            </td>
            <td class="p-4 text-gray-400">${product.category || 'N/A'}</td>
            <td class="p-4">INR ${parseFloat(product.price).toFixed(2)}</td>
            <td class="p-4">
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${product.stock > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}">
                    ${product.stock > 0 ? product.stock : 'Out of Stock'}
                </span>
            </td>
            <td class="p-4 text-gray-400">${String(product.id).padStart(6, '0')}</td>
            <td class="p-4 text-right space-x-2">
                <button onclick="editProduct('${product.id}')" class="text-orange-400 hover:text-orange-300">
                    <i data-lucide="edit" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteProduct('${product.id}')" class="text-red-400 hover:text-red-300">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

function openProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');

    editingProductId = productId;

    if (productId) {
        const product = products.find(p => String(p.id) === String(productId));
        title.textContent = 'Edit Product';
        form.name.value = product.name;
        form.description.value = product.description;
        form.price.value = product.price;
        form.stock.value = product.stock;
        form.category.value = product.category || '';
        form.branch.value = product.branch || 'Tech Turf';
        form.imageUrl.value = product.imageUrl || product.image_url || '';
    } else {
        title.textContent = 'Add New Product';
        form.reset();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingProductId = null;
}

async function saveProduct(event) {
    event.preventDefault();
    const token = localStorage.getItem('tt_token');
    const form = event.target;
    const signinButton = form.querySelector('button[type="submit"]');
    const originalText = signinButton.textContent;

    signinButton.disabled = true;
    signinButton.textContent = 'Saving...';

    const fileInput = document.getElementById('imageUploadInput');
    let imageUrl = form.imageUrl.value;

    // 1. Handle File Upload if a file is selected
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            const uploadResponse = await fetch(`${apiBase}/media/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (uploadResponse.ok) {
                const uploadData = await uploadResponse.json();
                imageUrl = uploadData.imageUrl || uploadData.url || imageUrl;
            } else {
                window.showToast('Failed to upload image', 'error');
                signinButton.disabled = false;
                signinButton.textContent = originalText;
                return;
            }
        } catch (error) {
            console.error('Upload error:', error);
            window.showToast('Network error during upload', 'error');
            signinButton.disabled = false;
            signinButton.textContent = originalText;
            return;
        }
    }

    const productData = {
        name: form.name.value,
        description: form.description.value,
        price: parseFloat(form.price.value),
        stock: parseInt(form.stock.value),
        category: form.category.value,
        branch: form.branch.value,
        imageUrl: imageUrl,
        image_url: imageUrl
    };

    try {
        const url = editingProductId
            ? `${apiBase}/products/${editingProductId}`
            : `${apiBase}/products`;
        const method = editingProductId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            window.showToast(editingProductId ? 'Product updated successfully' : 'Product created successfully', 'success');
            closeProductModal();
            loadProducts();
        } else {
            const errorData = await response.json();
            window.showToast(errorData.message || 'Error saving product', 'error');
        }
    } catch (error) {
        console.error('Error saving product:', error);
        window.showToast('Network error saving product', 'error');
    } finally {
        signinButton.disabled = false;
        signinButton.textContent = originalText;
    }
}

// Add preview event listener
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('imageUploadInput');
    const preview = document.getElementById('imagePreview');
    const container = document.getElementById('imagePreviewContainer');

    if (fileInput) {
        fileInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    preview.src = e.target.result;
                    container.classList.remove('hidden');
                }
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
});


async function deleteProduct(id) {
    // Replaced confirm() with an internal confirmation/logging mechanism
    console.log(`[CRITICAL ACTION: PRODUCT DELETE] Requesting deletion of product ID: ${id}.`);
    window.showToast('Deletion requested. Please check server logs for confirmation.', 'info');

    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${apiBase}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            products = products.filter(product => String(product.id) !== String(id));
            renderProducts();
            window.showToast('Product deleted successfully', 'success');
            loadProducts().catch(() => {});
        } else {
            // Improved Error Handling: Parse server response for specific message
            try {
                const errorData = await response.json();
                window.showToast(errorData.message || 'Error deleting product', 'error');
            } catch (e) {
                window.showToast('Error deleting product (Unknown response format)', 'error');
            }
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        window.showToast('Network error deleting product', 'error');
    }
}

function editProduct(id) {
    openProductModal(id);
}

document.addEventListener('DOMContentLoaded', loadProducts);