// Advanced Search Component
// Add to products.html or create a search page

class AdvancedSearch {
    constructor() {
        this.filters = {
            q: '',
            category: '',
            branch: '',
            minPrice: '',
            maxPrice: '',
            inStock: false,
            sort: 'newest'
        };
        this.results = [];
        this.pagination = {};
        this.init();
    }

    init() {
        this.renderSearchUI();
        this.attachEventListeners();
        this.loadFromURL();
    }

    renderSearchUI() {
        const container = document.getElementById('search-container') || document.querySelector('main');
        if (!container) return;

        const searchHTML = `
            <div class="advanced-search-wrapper mb-8">
                <!-- Search Bar -->
                <div class="search-bar-container mb-6">
                    <form id="search-form" class="relative">
                        <input 
                            type="text" 
                            id="search-query" 
                            value="${this.filters.q}"
                            placeholder="Search products..." 
                            class="w-full px-6 py-4 pr-32 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                        >
                        <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-[#F26522] text-white rounded-lg font-bold hover:bg-[#d45a1e]">
                            Search
                        </button>
                    </form>
                    <div id="search-suggestions" class="hidden absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl"></div>
                </div>

                <!-- Filters -->
                <div class="filters-container grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <select id="filter-category" class="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]">
                        <option value="">All Categories</option>
                    </select>

                    <select id="filter-branch" class="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]">
                        <option value="">All Branches</option>
                    </select>

                    <input type="number" id="filter-min-price" placeholder="Min Price" value="${this.filters.minPrice}"
                        class="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26522]">

                    <input type="number" id="filter-max-price" placeholder="Max Price" value="${this.filters.maxPrice}"
                        class="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26522]">

                    <select id="filter-sort" class="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F26522]">
                        <option value="newest">Newest First</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="name_asc">Name: A to Z</option>
                        <option value="name_desc">Name: Z to A</option>
                    </select>
                </div>

                <div class="flex items-center gap-4 mb-6">
                    <label class="flex items-center gap-2 text-white">
                        <input type="checkbox" id="filter-in-stock" ${this.filters.inStock ? 'checked' : ''}
                            class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-[#F26522] focus:ring-[#F26522]">
                        <span>In Stock Only</span>
                    </label>
                    <button id="clear-filters-btn" class="ml-auto px-4 py-2 text-gray-400 hover:text-white transition-colors">
                        Clear All Filters
                    </button>
                </div>

                <!-- Results -->
                <div id="search-results-info" class="mb-4 text-gray-400"></div>
                <div id="search-results" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8"></div>
                <div id="search-pagination" class="flex justify-center gap-2"></div>
            </div>
        `;

        if (container.id === 'search-container') {
            container.innerHTML = searchHTML;
        } else {
            container.insertAdjacentHTML('afterbegin', searchHTML);
        }
    }

    attachEventListeners() {
        // Search form
        document.getElementById('search-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.performSearch();
        });

        // Search suggestions (autocomplete)
        const searchInput = document.getElementById('search-query');
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(this.suggestionTimeout);
            this.suggestionTimeout = setTimeout(() => {
                this.fetchSuggestions(e.target.value);
            }, 300);
        });

        // Filters
        ['filter-category', 'filter-branch', 'filter-sort'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.performSearch());
        });

        ['filter-min-price', 'filter-max-price'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.performSearch());
        });

        document.getElementById('filter-in-stock')?.addEventListener('change', () => this.performSearch());

        // Clear filters
        document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }

    async performSearch(page = 1) {
        this.filters.q = document.getElementById('search-query').value;
        this.filters.category = document.getElementById('filter-category').value;
        this.filters.branch = document.getElementById('filter-branch').value;
        this.filters.minPrice = document.getElementById('filter-min-price').value;
        this.filters.maxPrice = document.getElementById('filter-max-price').value;
        this.filters.inStock = document.getElementById('filter-in-stock').checked;
        this.filters.sort = document.getElementById('filter-sort').value;

        const params = new URLSearchParams();
        Object.entries(this.filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        params.append('page', page);

        try {
            const response = await fetch(`${window.API_BASE_URL}/search?${params}`);
            const data = await response.json();

            this.results = data.products || [];
            this.pagination = data.pagination || {};
            this.renderResults();
            this.renderPagination();
            this.updateFiltersOptions(data.filters);
            this.updateURL();
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    async fetchSuggestions(query) {
        if (query.length < 2) {
            document.getElementById('search-suggestions').classList.add('hidden');
            return;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL}/search/suggestions?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            const suggestionsDiv = document.getElementById('search-suggestions');
            if (data.suggestions && data.suggestions.length > 0) {
                suggestionsDiv.innerHTML = data.suggestions.map(s => `
                    <div class="px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors" onclick="document.getElementById('search-query').value='${s.name}'; document.getElementById('search-form').dispatchEvent(new Event('submit'));">
                        <div class="font-semibold text-white">${s.name}</div>
                        <div class="text-sm text-gray-400">${s.category}</div>
                    </div>
                `).join('');
                suggestionsDiv.classList.remove('hidden');
            } else {
                suggestionsDiv.classList.add('hidden');
            }
        } catch (error) {
            console.error('Suggestions error:', error);
        }
    }

    renderResults() {
        const resultsDiv = document.getElementById('search-results');
        const infoDiv = document.getElementById('search-results-info');

        if (!resultsDiv) return;

        infoDiv.textContent = `Found ${this.pagination.total || 0} products`;

        if (this.results.length === 0) {
            resultsDiv.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400">No products found</div>';
            return;
        }

        resultsDiv.innerHTML = this.results.map(product => `
            <a href="product_details.html?id=${product._id}" class="group block bg-gray-800/30 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-all">
                <div class="aspect-square bg-gray-700">
                    <img src="${window.normalizeProductImageUrl ? window.normalizeProductImageUrl(product.imageUrl || product.image_url || product.images?.[0] || product.image) : (product.imageUrl || product.image_url || product.images?.[0] || product.image || '/public/images/space-bg.png')}" 
                         alt="${product.name}" 
                         class="w-full h-full object-cover">
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-white mb-2 line-clamp-2">${product.name}</h3>
                    <div class="flex items-center justify-between">
                        <span class="text-[#F26522] font-bold text-xl">$${product.price?.toFixed(2)}</span>
                        <span class="text-xs text-gray-400">${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                    </div>
                </div>
            </a>
        `).join('');
    }

    renderPagination() {
        const paginationDiv = document.getElementById('search-pagination');
        if (!paginationDiv || !this.pagination.pages) return;

        const pages = [];
        for (let i = 1; i <= this.pagination.pages; i++) {
            pages.push(`
                <button onclick="window.advancedSearch.performSearch(${i})" 
                    class="px-4 py-2 ${i === this.pagination.page ? 'bg-[#F26522] text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'} rounded-lg transition-colors">
                    ${i}
                </button>
            `);
        }

        paginationDiv.innerHTML = pages.join('');
    }

    updateFiltersOptions(filters) {
        if (!filters) return;

        // Update category dropdown
        const categorySelect = document.getElementById('filter-category');
        if (categorySelect && filters.categories) {
            const currentValue = categorySelect.value;
            categorySelect.innerHTML = '<option value="">All Categories</option>' +
                filters.categories.map(cat => `<option value="${cat}" ${cat === currentValue ? 'selected' : ''}>${cat}</option>`).join('');
        }

        // Update branch dropdown
        const branchSelect = document.getElementById('filter-branch');
        if (branchSelect && filters.branches) {
            const currentValue = branchSelect.value;
            branchSelect.innerHTML = '<option value="">All Branches</option>' +
                filters.branches.map(branch => `<option value="${branch}" ${branch === currentValue ? 'selected' : ''}>${branch}</option>`).join('');
        }
    }

    clearFilters() {
        this.filters = { q: '', category: '', branch: '', minPrice: '', maxPrice: '', inStock: false, sort: 'newest' };
        this.renderSearchUI();
        this.attachEventListeners();
        this.performSearch();
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        Object.keys(this.filters).forEach(key => {
            const value = params.get(key);
            if (value) this.filters[key] = key === 'inStock' ? value === 'true' : value;
        });
        this.performSearch();
    }

    updateURL() {
        const params = new URLSearchParams();
        Object.entries(this.filters).forEach(([key, value]) => {
            if (value) params.set(key, value);
        });
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    window.advancedSearch = new AdvancedSearch();
});

export default AdvancedSearch;
