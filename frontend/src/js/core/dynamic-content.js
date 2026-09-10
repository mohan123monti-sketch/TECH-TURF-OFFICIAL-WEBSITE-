/**
 * Dynamic CMS Content Fetcher
 * Automatically fetches content from the backend based on the current page
 * and injects it into elements with `data-content-key`.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const isFile = window.location.protocol === 'file:';
    const API_BASE = window.API_BASE_URL || (isFile ? 'http://localhost:5001/api' : 'http://localhost:5001/api');

    // Determine current page from URL
    const pathname = window.location.pathname;
    let page = 'home'; // default
    if (pathname.includes('about')) page = 'about';
    else if (pathname.includes('contact')) page = 'contact';
    else if (pathname.includes('shopping') || pathname.includes('products')) page = 'shop';

    const fetchContent = async (pageName) => {
        try {
            const res = await fetch(`${API_BASE}/content/${pageName}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.sections || {};
        } catch (error) {
            console.error(`Error fetching CMS content for ${pageName}:`, error);
            return null;
        }
    };

    const applyContent = (sections) => {
        if (!sections) return;
        Object.entries(sections).forEach(([key, value]) => {
            if (!value) return;
            const elements = document.querySelectorAll(`[data-content-key="${key}"]`);
            elements.forEach(el => {
                // If it's an anchor tag and it's a URL, set href, otherwise set textContent/innerHTML
                if (el.tagName === 'A' && (key.includes('url') || key === 'twitter' || key === 'instagram')) {
                    el.href = value;
                } else if (key.includes('subtitle') || key.includes('description') || key.includes('mission') || key.includes('vision') || key.includes('address')) {
                    // Use innerHTML to preserve line breaks if we add a formatter later, but textContent is safer.
                    // Converting newlines to <br> for textareas
                    el.innerHTML = value.replace(/\n/g, '<br>');
                } else {
                    // For buttons, spans, headings, we set text content
                    if (el.tagName === 'BUTTON' || el.classList.contains('button-text')) {
                         el.textContent = value;
                    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                         el.value = value;
                    } else {
                         el.innerHTML = value; // innerHTML allows nested spans if needed, e.g. TECH <span class="...">TURF</span>
                    }
                }
            });
        });
    };

    // 1. Fetch and apply page-specific content
    const pageContent = await fetchContent(page);
    applyContent(pageContent);

    // 2. Fetch and apply Header content
    const headerContent = await fetchContent('header');
    applyContent(headerContent);

    // 3. Fetch and apply Footer content
    const footerContent = await fetchContent('footer');
    applyContent(footerContent);
});
