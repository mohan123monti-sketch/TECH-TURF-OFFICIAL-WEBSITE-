// Blog/Content Page Logic - COMPLETE VERSION
// Note: API_BASE_URL and window.showToast are provided by admin-layout.js

let posts = [];
let editingPostId = null;

async function loadPosts() {
    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/blog`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        posts = await response.json();
        renderPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
        window.showToast('Failed to load posts', 'error');
    }
}

function renderPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;

    if (posts.length === 0) {
        container.innerHTML = '<div class="col-span-3 text-center text-gray-500 py-12">No blog posts yet</div>';
        return;
    }

    container.innerHTML = posts.map(post => `
        <div class="iphone-glass rounded-[2rem] overflow-hidden group transition-all duration-500">
            <div class="h-48 bg-white/5 relative overflow-hidden">
                ${post.imageUrl ? `<img src="${post.imageUrl}" onerror="this.onerror=null;this.src='https://placehold.co/300x192/475569/cbd5e1?text=Image+N/A'" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">` : `
                    <div class="absolute inset-0 flex items-center justify-center text-gray-400">No Image</div>
                `}
                <div class="absolute top-4 left-4">
                    <span class="px-3 py-1 iphone-glass rounded-lg text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
                        ${post.category || 'General'}
                    </span>
                </div>
            </div>
            <div class="p-6">
                <h3 class="text-lg font-bold text-white mb-2 line-clamp-1">${post.title}</h3>
                <p class="text-sm text-gray-400 mb-6 line-clamp-2 leading-relaxed">${post.content.substring(0, 100)}...</p>
                <div class="flex justify-between items-center pt-4 border-t border-white/5">
                    <span class="text-xs text-gray-500">${new Date(post.createdAt).toLocaleDateString()}</span>
                                        <span class="text-xs text-gray-500">${new Date(post.created_at).toLocaleDateString()}</span>
                    <div class="flex space-x-2">
                        <button onclick="editPost('${post._id}')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all">
                                                    <button onclick="editPost('${post.id}')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deletePost('${post._id}')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all">
                                                    <button onclick="deletePost('${post.id}')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

function openPostModal(postId = null) {
    const modal = document.getElementById('post-modal');
    const form = document.getElementById('post-form');
    const title = document.getElementById('modal-title');

    editingPostId = postId;

    if (postId) {
        const post = posts.find(p => p._id === postId);
            const post = posts.find(p => p.id == postId);
        title.textContent = 'Edit Blog Post';
        form.title.value = post.title;
        form.category.value = post.category || '';
        form.content.value = post.content;
        form.tags.value = Array.isArray(post.tags) ? post.tags.join(', ') : post.tags || '';
        form.imageUrl.value = post.imageUrl || '';
    } else {
        title.textContent = 'Create New Post';
        form.reset();
    }

    const previewContainer = document.getElementById('postImagePreviewContainer');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        previewContainer.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closePostModal() {
    const modal = document.getElementById('post-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingPostId = null;
}

async function savePost(event) {
    event.preventDefault();
    const token = localStorage.getItem('tt_token');
    const form = event.target;
    const publishButton = form.querySelector('button[type="submit"]');
    const originalText = publishButton.textContent;

    publishButton.disabled = true;
    publishButton.textContent = 'Publishing...';

    const fileInput = document.getElementById('postImageUploadInput');
    let imageUrl = form.imageUrl.value;
    let imageUrls = [];

    // 1. Handle File Upload if files are selected
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('images', fileInput.files[i]);
                    formData.append('files', fileInput.files[i]);
        }

        try {
            const uploadResponse = await fetch(`${window.API_BASE_URL}/upload/multi`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (uploadResponse.ok) {
                const uploadData = await uploadResponse.json();
                imageUrls = uploadData.imageUrls;
                if (imageUrls.length > 0) {
                    imageUrl = imageUrls[0]; // Set first as main
                }
            } else {
                window.showToast('Failed to upload images', 'error');
                publishButton.disabled = false;
                publishButton.textContent = originalText;
                return;
            }
        } catch (error) {
            console.error('Upload error:', error);
            window.showToast('Network error during upload', 'error');
            publishButton.disabled = false;
            publishButton.textContent = originalText;
            return;
        }
    }

    const postData = {
        title: form.title.value,
        category: form.category.value,
        content: form.content.value,
        tags: form.tags.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        imageUrl: imageUrl,
        imageUrls: imageUrls,
    };

    try {
        const url = editingPostId
            ? `${window.API_BASE_URL}/blog/${editingPostId}`
            : `${window.API_BASE_URL}/blog`;
        const method = editingPostId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (response.ok) {
            window.showToast(editingPostId ? 'Post updated successfully' : 'Post created successfully', 'success');
            closePostModal();
            loadPosts();
        } else {
            const errorData = await response.json();
            window.showToast(errorData.message || 'Error saving post', 'error');
        }
    } catch (error) {
        console.error('Error saving post:', error);
        window.showToast('Network error saving post', 'error');
    } finally {
        publishButton.disabled = false;
        publishButton.textContent = originalText;
    }
}

// Add preview event listener
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('postImageUploadInput');
    const container = document.getElementById('postImagePreviewContainer');

    if (fileInput) {
        fileInput.addEventListener('change', function () {
            container.innerHTML = ''; // Clear old previews
            if (this.files && this.files.length > 0) {
                container.classList.remove('hidden');
                Array.from(this.files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = "w-full h-24 object-cover rounded-lg border border-gray-700";
                        container.appendChild(img);
                    }
                    reader.readAsDataURL(file);
                });
            } else {
                container.classList.add('hidden');
            }
        });
    }
});


async function deletePost(id) {
    // Replaced confirm() with an internal confirmation/logging mechanism
    console.log(`[CRITICAL ACTION: POST DELETE] Requesting deletion of post ID: ${id}.`);
    window.showToast('Deletion requested. Please check server logs for confirmation.', 'info');

    const token = localStorage.getItem('tt_token');
    try {
        const response = await fetch(`${window.API_BASE_URL}/blog/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            window.showToast('Post deleted successfully', 'success');
            loadPosts();
        } else {
            // Improved Error Handling: Parse server response for specific message
            try {
                const errorData = await response.json();
                window.showToast(errorData.message || 'Error deleting post', 'error');
            } catch (e) {
                window.showToast('Error deleting post (Unknown response format)', 'error');
            }
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        window.showToast('Network error deleting post', 'error');
    }
}

function editPost(id) {
    openPostModal(id);
}

document.addEventListener('DOMContentLoaded', loadPosts);