// Orders Page Logic
// Note: API_BASE_URL and window.showToast are provided by admin-layout.js

let orders = [];

async function loadOrders() {
    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        orders = await response.json();
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        window.showToast('Failed to load orders', 'error');
    }
}

function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No orders found.</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const statusColors = {
            Pending: 'bg-yellow-500/10 text-yellow-500',
            Processing: 'bg-blue-500/10 text-blue-500',
            Shipped: 'bg-indigo-500/10 text-indigo-500',
            Delivered: 'bg-green-500/10 text-green-500',
            Cancelled: 'bg-red-500/10 text-red-500'
        };

        const displayStatus = order.status || (order.isDelivered ? 'Delivered' : 'Pending');
        const totalPrice = Number(order.totalPrice || 0);
        return `
            <tr class="hover:bg-gray-700/30 transition-colors">
                <td class="p-4 font-mono text-gray-400">#${String(order.id).padStart(6, '0')}</td>
                <td class="p-4">
                    <div class="font-medium">${order.userName || 'Guest'}</div>
                    <div class="text-xs text-gray-500">${order.userEmail || 'N/A'}</div>
                </td>
                <td class="p-4 text-gray-400">${new Date(order.created_at).toLocaleDateString()}</td>
                <td class="p-4 font-bold">₹${totalPrice.toFixed(2)}</td>
                <td class="p-4">
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${statusColors[displayStatus] || statusColors['Pending']}">
                        ${displayStatus}
                    </span>
                </td>
                <td class="p-4 text-right space-x-2">
                    <button onclick="viewOrder('${order.id}')" class="text-blue-400 hover:text-blue-300 text-sm font-medium">View Details</button>
                    <!-- Status update dropdown/modal action would go here -->
                </td>
            </tr>
        `;
    }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            window.showToast('Order status updated', 'success');
            loadOrders();
        } else {
            // Improved Error Handling: Parse server response for specific message
            try {
                const errorData = await response.json();
                window.showToast(errorData.message || 'Error updating order status', 'error');
            } catch (e) {
                window.showToast('Error updating order status (Unknown response format)', 'error');
            }
        }
    } catch (error) {
        console.error('Network error updating order:', error);
        window.showToast('Network error updating order', 'error');
    }
}

let currentViewingOrderId = null;

function viewOrder(orderId) {
    const order = orders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    currentViewingOrderId = orderId;

    // Set Basic Info
    document.getElementById('modal-order-id').textContent = `Order #${String(order.id).padStart(6, '0')}`;
    document.getElementById('modal-order-date').textContent = new Date(order.created_at).toLocaleString();
    document.getElementById('modal-customer-name').textContent = order.userName || 'Guest';
    document.getElementById('modal-customer-email').textContent = order.userEmail || 'N/A';
    const displayStatus = order.status || (order.isDelivered ? 'Delivered' : 'Pending');
    document.getElementById('modal-total-price').textContent = `₹${Number(order.totalPrice || 0).toFixed(2)}`;
    document.getElementById('modal-status-select').value = displayStatus;

    // Render Items
    const itemsContainer = document.getElementById('modal-order-items');
    if (order.orderItems && order.orderItems.length > 0) {
        itemsContainer.innerHTML = order.orderItems.map(item => `
            <div class="flex items-center justify-between p-3 bg-gray-700/20 rounded-xl border border-white/5">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden">
                        <img src="${item.image || item.imageUrl || 'https://placehold.co/100'}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <p class="font-bold text-white">${item.name}</p>
                        <p class="text-xs text-gray-400">Qty: ${item.qty || item.quantity || 1}</p>
                    </div>
                </div>
                <p class="font-mono text-orange-400">₹${(Number(item.price || 0) * (item.qty || item.quantity || 1)).toFixed(2)}</p>
            </div>
        `).join('');
    } else {
        itemsContainer.innerHTML = '<p class="text-gray-500 text-sm">No items found in this order.</p>';
    }

    // Show Modal
    const modal = document.getElementById('order-modal');
    modal.classList.remove('hidden');

    if (window.lucide) lucide.createIcons();
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
    currentViewingOrderId = null;
}

function handleStatusChange(event) {
    if (currentViewingOrderId) {
        updateOrderStatus(currentViewingOrderId, event.target.value);
    }
}

document.addEventListener('DOMContentLoaded', loadOrders);
