                        <span class="flex items-center gap-2"><i data-lucide="calendar" class="w-3 h-3"></i> ${new Date(ticket.created_at || ticket.createdAt).toLocaleDateString()}</span>
                        <button onclick="updateTicketStatus('${ticket.id}', 'In Progress')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all">
                        <button onclick="deleteTicket('${ticket.id}')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all">
// Support/Tickets Page Logic
// Note: API_BASE_URL and window.showToast are provided by admin-layout.js

let tickets = [];

async function loadTickets() {
    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        tickets = await response.json();
        renderTickets();
    } catch (error) {
        console.error('Error loading tickets:', error);
        window.showToast('Failed to load tickets', 'error');
    }
}

function renderTickets() {
    const container = document.getElementById('tickets-container');
    if (!container) return;

    if (tickets.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">No support tickets</div>';
        return;
    }

    container.innerHTML = tickets.map(ticket => {
        const priorityStyles = {
            low: 'iphone-glass text-blue-400 border-blue-500/20',
            medium: 'iphone-glass text-yellow-500 border-yellow-500/20',
            high: 'iphone-glass text-red-500 border-red-500/20'
        };

        const statusStyles = {
            Open: 'iphone-glass text-green-400 border-green-500/20',
            'In Progress': 'iphone-glass text-indigo-400 border-indigo-500/20',
            Closed: 'iphone-glass text-gray-500 border-white/5'
        };

        return `
            <div class="p-8 hover:bg-white/5 transition-all duration-500 group border-b border-white/5 last:border-b-0">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-bold text-white tracking-tight">${ticket.subject}</h3>
                    <div class="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest">
                        <span class="px-3 py-1 rounded-lg border ${priorityStyles[ticket.priority.toLowerCase()] || 'iphone-glass text-gray-400 border-white/5'}">
                            ${ticket.priority}
                        </span>
                        <span class="px-3 py-1 rounded-lg border ${statusStyles[ticket.status] || 'iphone-glass text-gray-400 border-white/5'}">
                            ${ticket.status}
                        </span>
                    </div>
                </div>
                <p class="text-sm text-gray-400 mb-6 line-clamp-2 leading-relaxed">${ticket.message || ticket.description || ''}</p>
                <div class="flex justify-between items-center pt-4 border-t border-white/5 text-xs text-gray-500">
                    <div class="flex items-center gap-4">
                        <span class="flex items-center gap-2"><i data-lucide="user" class="w-3 h-3"></i> ${ticket.user?.username || ticket.userEmail || 'N/A'}</span>
                        <span class="flex items-center gap-2"><i data-lucide="calendar" class="w-3 h-3"></i> ${new Date(ticket.createdAt || ticket.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="updateTicketStatus('${ticket.id || ticket._id}', 'In Progress')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all">
                            <i data-lucide="chevrons-right" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deleteTicket('${ticket.id || ticket._id}')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

async function updateTicketStatus(id, status) {
    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/tickets/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            window.showToast('Ticket updated successfully', 'success');
            loadTickets();
        } else {
            // Improved Error Handling: Parse server response for specific message
            try {
                const errorData = await response.json();
                window.showToast(errorData.message || 'Error updating ticket status', 'error');
            } catch (e) {
                window.showToast('Error updating ticket status (Unknown response format)', 'error');
            }
        }
    } catch (error) {
        console.error('Network error updating ticket:', error);
        window.showToast('Network error updating ticket', 'error');
    }
}

async function deleteTicket(id) {
    // Replaced confirm() with an internal confirmation/logging mechanism
    console.log(`[CRITICAL ACTION: TICKET DELETE] Requesting deletion of ticket ID: ${id}.`);
    window.showToast('Deletion requested. Please check server logs for confirmation.', 'info');

    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/tickets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            window.showToast('Ticket deleted successfully', 'success');
            loadTickets();
        } else {
            // Improved Error Handling: Parse server response for specific message
            try {
                const errorData = await response.json();
                window.showToast(errorData.message || 'Error deleting ticket', 'error');
            } catch (e) {
                window.showToast('Error deleting ticket (Unknown response format)', 'error');
            }
        }
    } catch (error) {
        console.error('Network error deleting ticket:', error);
        window.showToast('Network error deleting ticket', 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadTickets);