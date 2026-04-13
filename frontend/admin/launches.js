                    <button onclick="editLaunch('${launch.id}')" class="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
// Launches Page Logic
// Note: API_BASE_URL and showToast are provided by admin-layout.js

let launches = [];
let editingLaunchId = null;

async function loadLaunches() {
    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/launches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        launches = await response.json();
        renderLaunches();
    } catch (error) {
        console.error('Error loading launches:', error);
        window.showToast('Failed to load launches', 'error');
    }
}

function renderLaunches() {
    const container = document.getElementById('launches-container');
    if (!container) return;

    if (launches.length === 0) {
        container.innerHTML = '<div class="col-span-2 text-center text-gray-500 py-12">No launches scheduled</div>';
        return;
    }

    const statusLabels = {
        scheduled: 'Scheduled',
        go_for_launch: 'Go for Launch',
        launched: 'Launched',
        aborted: 'Aborted',
        failed: 'Failed',
        success: 'Success'
    };

    container.innerHTML = launches.map(launch => `
        <div class="bg-gray-800 rounded-xl border border-gray-700 p-6 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px]"></div>
            
            <div class="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <span class="text-orange-500 font-mono text-xs tracking-widest uppercase mb-1 block">${statusLabels[launch.status] || 'Scheduled'}</span>
                    <h3 class="text-xl font-bold text-white">${launch.missionName}</h3>
                </div>
                <div class="flex gap-2">
                    <button onclick="editLaunch('${launch._id}')" class="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                     <!-- Optional: Add delete button here if API supports it -->
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4 relative z-10">
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Launch Date</p>
                    <p class="text-sm text-gray-300 font-mono">${launch.launchDate ? new Date(launch.launchDate).toLocaleDateString() : 'TBD'}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Rocket</p>
                    <p class="text-sm text-gray-300 font-mono">${launch.rocketName || 'Unknown'}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Summary</p>
                    <p class="text-sm text-gray-300">${launch.missionSummary || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Telemetry</p>
                    <p class="text-sm text-gray-300">${launch.telemetryData || 'N/A'}</p>
                </div>
            </div>
            
            <!-- Progress bar decoration -->
            <div class="w-full h-1 bg-gray-700 rounded-full overflow-hidden mt-2">
                <div class="h-full bg-gradient-to-r from-orange-500 to-red-600 w-2/3"></div>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

function openLaunchModal(launchId = null) {
    const modal = document.getElementById('launch-modal');
    const form = document.getElementById('launch-form');
    const title = document.getElementById('modal-title');

    editingLaunchId = launchId;

    if (launchId) {
        const launch = launches.find(l => l._id === launchId);
            const launch = launches.find(l => l.id == launchId);
        title.textContent = 'Edit Mission';
        form.missionName.value = launch.missionName;
        // Format date for input type="date"
        form.launchDate.value = launch.launchDate ? new Date(launch.launchDate).toISOString().split('T')[0] : '';
        form.rocketName.value = launch.rocketName;
        form.status.value = launch.status;
        form.missionSummary.value = launch.missionSummary || '';
        form.telemetryData.value = launch.telemetryData || '';
    } else {
        title.textContent = 'Schedule New Mission';
        form.reset();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeLaunchModal() {
    const modal = document.getElementById('launch-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingLaunchId = null;
}

async function saveLaunch(event) {
    event.preventDefault();
    const token = localStorage.getItem('tt_token');
    const form = event.target;

    const launchData = {
        missionName: form.missionName.value,
        launchDate: form.launchDate.value,
        rocketName: form.rocketName.value,
        status: form.status.value,
        missionSummary: form.missionSummary.value,
        telemetryData: form.telemetryData.value
    };

    try {
        const url = editingLaunchId
            ? `${window.API_BASE_URL}/launches/${editingLaunchId}`
            : `${window.API_BASE_URL}/launches`;
        const method = editingLaunchId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(launchData)
        });

        if (response.ok) {
            window.showToast(editingLaunchId ? 'Mission updated successfully' : 'Mission scheduled successfully', 'success');
            closeLaunchModal();
            loadLaunches();
        } else {
            // Improved Error Handling: Parse server response
            try {
                const errorData = await response.json();
                window.showToast(errorData.message || 'Error saving mission', 'error');
            } catch (e) {
                window.showToast('Error saving mission (Unknown response format)', 'error');
            }
        }
    } catch (error) {
        console.error('Error saving launch:', error);
        window.showToast('Network error saving mission', 'error');
    }
}

function editLaunch(id) {
    openLaunchModal(id);
}

document.addEventListener('DOMContentLoaded', loadLaunches);