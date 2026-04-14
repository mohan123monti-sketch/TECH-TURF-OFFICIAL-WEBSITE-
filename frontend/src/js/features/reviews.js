// Product Reviews Component
// Usage: Include on product details page

class ProductReviews {
    constructor(productId) {
        this.productId = productId;
        this.reviews = [];
        this.avgRating = 0;
        this.init();
    }

    async init() {
        await this.loadReviews();
        this.render();
        this.attachEventListeners();
    }

    async loadReviews() {
        try {
            const response = await fetch(`${window.API_BASE_URL}/reviews/product/${this.productId}`);
            const data = await response.json();
            this.reviews = data.reviews || [];
            this.avgRating = parseFloat(data.avgRating) || 0;
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    render() {
        const container = document.getElementById('product-reviews');
        if (!container) return;

        const html = `
            <div class="reviews-section mt-12">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-3xl font-bold text-white">Customer Reviews</h2>
                    <button id="write-review-btn" class="px-6 py-3 bg-[#F26522] text-white rounded-lg font-bold hover:bg-[#d45a1e] transition-all">
                        Write a Review
                    </button>
                </div>

                <div class="flex items-center gap-6 mb-8 p-6 bg-gray-800/30 rounded-xl">
                    <div class="text-center">
                        <div class="text-5xl font-bold text-white">${this.avgRating}</div>
                        <div class="text-yellow-500 text-2xl mt-2">${this.renderStars(this.avgRating)}</div>
                        <div class="text-gray-400 text-sm mt-2">${this.reviews.length} reviews</div>
                    </div>
                    <div class="flex-1">
                        ${this.renderRatingDistribution()}
                    </div>
                </div>

                <div id="review-form-container" class="hidden mb-8">
                    ${this.renderReviewForm()}
                </div>

                <div class="space-y-4">
                    ${this.reviews.length > 0 ? this.reviews.map(review => this.renderReview(review)).join('') : '<p class="text-gray-400 text-center py-8">No reviews yet. Be the first to review!</p>'}
                </div>
            </div>
        `;

        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '★';
            } else if (i === fullStars && hasHalfStar) {
                stars += '⯨';
            } else {
                stars += '☆';
            }
        }
        return stars;
    }

    renderRatingDistribution() {
        const dist = [5, 4, 3, 2, 1].map(star => {
            const count = this.reviews.filter(r => r.rating === star).length;
            const percentage = this.reviews.length > 0 ? (count / this.reviews.length) * 100 : 0;
            return `
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-white text-sm w-8">${star}★</span>
                    <div class="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-yellow-500" style="width: ${percentage}%"></div>
                    </div>
                    <span class="text-gray-400 text-sm w-12">${count}</span>
                </div>
            `;
        }).join('');
        return dist;
    }

    renderReviewForm() {
        return `
            <form id="review-submit-form" class="p-6 bg-gray-800/30 rounded-xl">
                <h3 class="text-xl font-bold text-white mb-4">Write Your Review</h3>
                <div class="mb-4">
                    <label class="block text-white mb-2">Rating</label>
                    <div class="flex gap-2" id="rating-stars">
                        ${[1,2,3,4,5].map(i => `<button type="button" data-rating="${i}" class="text-4xl text-gray-600 hover:text-yellow-500 transition-colors">☆</button>`).join('')}
                    </div>
                    <input type="hidden" id="review-rating" name="rating" required>
                </div>
                <div class="mb-4">
                    <label class="block text-white mb-2">Your Review</label>
                    <textarea id="review-comment" name="comment" rows="4" required
                        class="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                        placeholder="Share your experience with this product..."></textarea>
                </div>
                <div class="flex gap-3">
                    <button type="submit" class="px-6 py-3 bg-[#F26522] text-white rounded-lg font-bold hover:bg-[#d45a1e]">
                        Submit Review
                    </button>
                    <button type="button" id="cancel-review-btn" class="px-6 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600">
                        Cancel
                    </button>
                </div>
            </form>
        `;
    }

    renderReview(review) {
        return `
            <div class="p-6 bg-gray-800/30 rounded-xl">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <span class="font-bold text-white">${review.user?.username || 'Anonymous'}</span>
                            ${review.verified ? '<span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Verified Purchase</span>' : ''}
                        </div>
                        <div class="text-yellow-500">${this.renderStars(review.rating)}</div>
                    </div>
                    <span class="text-gray-400 text-sm">${new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <p class="text-gray-300 mb-3">${review.comment}</p>
                <button class="text-gray-400 text-sm hover:text-white transition-colors" onclick="this.closest('.reviews-section').dispatchEvent(new CustomEvent('helpful', {detail: '${review._id}'}))">
                    👍 Helpful (${review.helpful || 0})
                </button>
            </div>
        `;
    }

    attachEventListeners() {
        // Write review button
        const writeBtn = document.getElementById('write-review-btn');
        const formContainer = document.getElementById('review-form-container');
        const cancelBtn = document.getElementById('cancel-review-btn');
        const reviewForm = document.getElementById('review-submit-form');

        if (writeBtn) {
            writeBtn.addEventListener('click', () => {
                const token = localStorage.getItem('tt_token');
                if (!token) {
                    window.showToast?.('Please login to write a review', 'error');
                    window.location.href = '/pages/login.html';
                    return;
                }
                formContainer.classList.remove('hidden');
                writeBtn.style.display = 'none';
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                formContainer.classList.add('hidden');
                writeBtn.style.display = 'block';
            });
        }

        // Rating stars
        const ratingStars = document.querySelectorAll('#rating-stars button');
        ratingStars.forEach(star => {
            star.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                document.getElementById('review-rating').value = rating;
                ratingStars.forEach((s, i) => {
                    s.textContent = i < rating ? '★' : '☆';
                    s.classList.toggle('text-yellow-500', i < rating);
                    s.classList.toggle('text-gray-600', i >= rating);
                });
            });
        });

        // Form submission
        if (reviewForm) {
            reviewForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitReview();
            });
        }

        // Helpful button
        document.getElementById('product-reviews')?.addEventListener('helpful', async (e) => {
            await this.markHelpful(e.detail);
        });
    }

    async submitReview() {
        const token = localStorage.getItem('tt_token');
        const rating = document.getElementById('review-rating').value;
        const comment = document.getElementById('review-comment').value;

        if (!rating) {
            window.showToast?.('Please select a rating', 'error');
            return;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: this.productId,
                    rating: parseInt(rating),
                    comment
                })
            });

            if (response.ok) {
                window.showToast?.('Review submitted successfully!', 'success');
                await this.loadReviews();
                this.render();
                this.attachEventListeners();
            } else {
                const data = await response.json();
                window.showToast?.(data.message || 'Failed to submit review', 'error');
            }
        } catch (error) {
            console.error('Review submission error:', error);
            window.showToast?.('An error occurred', 'error');
        }
    }

    async markHelpful(reviewId) {
        try {
            await fetch(`${window.API_BASE_URL}/reviews/${reviewId}/helpful`, {
                method: 'PUT'
            });
            await this.loadReviews();
            this.render();
            this.attachEventListeners();
        } catch (error) {
            console.error('Error marking helpful:', error);
        }
    }
}

// Initialize on product details page
if (window.location.pathname.includes('product-details.html')) {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (productId) {
        window.addEventListener('DOMContentLoaded', () => {
            new ProductReviews(productId);
        });
    }
}

export default ProductReviews;
