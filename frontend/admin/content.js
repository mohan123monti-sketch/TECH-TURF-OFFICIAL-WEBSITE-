// Blog/Content Page Logic - COMPLETE VERSION
// Note: API_BASE_URL and window.showToast are provided by admin-layout.js

let posts = [];
let editingPostId = null;
const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || 'http://localhost:5000/api';
const apiOrigin = new URL(apiBase).origin;

const editorState = {
    mode: 'blog',
    pages: [],
    selectedPath: '',
    dirty: false,
    loading: false,
    viewMode: 'visual',
    visualFields: [],
    smartTemplateName: ''
};

const editorEls = {
    tabBlog: null,
    tabPages: null,
    blogView: null,
    pagesView: null,
    pageList: null,
    selectedPath: null,
    content: null,
    saveBtn: null,
    refreshBtn: null,
    previewLink: null,
    status: null,
    helperStatus: null,
    visualWrapper: null,
    visualFields: null,
    viewVisualBtn: null,
    viewCodeBtn: null,
    regenerateBtn: null,
    modeLabel: null
};

const getToken = () => localStorage.getItem('tt_token') || localStorage.getItem('token') || '';

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function setEditorStatus(message, tone = 'normal') {
    if (!editorEls.status) return;
    editorEls.status.textContent = message;
    editorEls.status.className = 'text-xs';
    if (tone === 'error') editorEls.status.classList.add('text-red-300');
    else if (tone === 'success') editorEls.status.classList.add('text-green-300');
    else editorEls.status.classList.add('text-gray-400');
}

function setHelperStatus(message, tone = 'normal') {
    if (!editorEls.helperStatus) return;
    editorEls.helperStatus.textContent = message;
    editorEls.helperStatus.className = 'mt-4 text-sm';
    if (tone === 'error') editorEls.helperStatus.classList.add('text-red-300');
    else if (tone === 'success') editorEls.helperStatus.classList.add('text-green-300');
    else editorEls.helperStatus.classList.add('text-gray-400');
}

function toPreviewPath(relativePath) {
    const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    return normalized ? `/${normalized}` : '#';
}

function setPreviewLink(relativePath) {
    if (!editorEls.previewLink) return;
    if (!relativePath) {
        editorEls.previewLink.href = '#';
        editorEls.previewLink.classList.add('pointer-events-none', 'opacity-40');
        return;
    }

    editorEls.previewLink.href = `${apiOrigin}${toPreviewPath(relativePath)}`;
    editorEls.previewLink.classList.remove('pointer-events-none', 'opacity-40');
}

function markEditorDirty(isDirty) {
    editorState.dirty = !!isDirty;
    if (editorEls.saveBtn) {
        editorEls.saveBtn.disabled = !editorState.selectedPath || !editorState.dirty || editorState.loading;
    }
    if (editorState.dirty) {
        setEditorStatus('Unsaved changes', 'normal');
    }
}

function updateTabsUI() {
    const isBlog = editorState.mode === 'blog';
    if (editorEls.blogView) editorEls.blogView.classList.toggle('hidden', !isBlog);
    if (editorEls.pagesView) editorEls.pagesView.classList.toggle('hidden', isBlog);

    if (editorEls.tabBlog) {
        editorEls.tabBlog.className = isBlog
            ? 'px-4 py-2 text-sm font-semibold bg-white text-black'
            : 'px-4 py-2 text-sm font-semibold bg-white/5 text-white hover:bg-white/10 transition-all';
    }

    if (editorEls.tabPages) {
        editorEls.tabPages.className = !isBlog
            ? 'px-4 py-2 text-sm font-semibold bg-white text-black'
            : 'px-4 py-2 text-sm font-semibold bg-white/5 text-white hover:bg-white/10 transition-all';
    }
}

function switchEditorMode(mode) {
    const nextMode = mode === 'pages' ? 'pages' : 'blog';
    if (editorState.mode === nextMode) return;

    editorState.mode = nextMode;
    updateTabsUI();

    if (nextMode === 'pages' && editorState.pages.length === 0) {
        loadEditablePages();
    }
}

function setPageEditorViewMode(mode) {
    editorState.viewMode = mode === 'code' ? 'code' : 'visual';

    if (editorEls.visualWrapper) {
        editorEls.visualWrapper.classList.toggle('hidden', editorState.viewMode !== 'visual');
    }
    if (editorEls.content) {
        editorEls.content.classList.toggle('hidden', editorState.viewMode !== 'code');
    }

    if (editorEls.viewVisualBtn) {
        editorEls.viewVisualBtn.className = editorState.viewMode === 'visual'
            ? 'px-3 py-2 text-xs font-semibold bg-white text-black'
            : 'px-3 py-2 text-xs font-semibold bg-white/5 text-white hover:bg-white/10 transition-all';
    }
    if (editorEls.viewCodeBtn) {
        editorEls.viewCodeBtn.className = editorState.viewMode === 'code'
            ? 'px-3 py-2 text-xs font-semibold bg-white text-black'
            : 'px-3 py-2 text-xs font-semibold bg-white/5 text-white hover:bg-white/10 transition-all';
    }

    if (editorEls.modeLabel) {
        editorEls.modeLabel.textContent = editorState.viewMode === 'visual' ? 'Visual editor' : 'HTML editor';
    }

    if (editorState.viewMode === 'visual') {
        regenerateVisualFieldsFromSource(false);
    }
}

function parseHtmlToDocument(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html || '<!DOCTYPE html><html><head></head><body></body></html>', 'text/html');
}

function getSmartTemplateConfig(pagePath) {
    const normalized = String(pagePath || '').replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();

    if (normalized === 'index.html') {
        return {
            name: 'Home Smart Template',
            fields: [
                { id: 'home-page-title', kind: 'title', label: 'Page Title', inputType: 'text' },
                { id: 'home-welcome-text', kind: 'element', selector: '.hero-diagonal-right .hero-welcome', attr: 'text', label: 'Hero Welcome Text', inputType: 'text' },
                { id: 'home-brand-text', kind: 'element', selector: '.hero-diagonal-right .hero-brand', attr: 'text', label: 'Hero Brand Text', inputType: 'text' },
                { id: 'home-featured-heading', kind: 'element', selector: '#featured-products h2', attr: 'text', label: 'Featured Section Heading', inputType: 'text' },
                { id: 'home-featured-link-text', kind: 'element', selector: '#featured-products a[href]', attr: 'text', label: 'Featured CTA Text', inputType: 'text' },
                { id: 'home-featured-link-url', kind: 'element', selector: '#featured-products a[href]', attr: 'href', label: 'Featured CTA URL', inputType: 'text' },
                { id: 'home-divisions-heading', kind: 'element', selector: '#divisions h2', attr: 'text', label: 'Divisions Heading', inputType: 'text' },
                { id: 'home-divisions-description', kind: 'element', selector: '#divisions p', attr: 'text', label: 'Divisions Description', inputType: 'textarea' }
            ]
        };
    }

    if (normalized === 'pages/about.html') {
        return {
            name: 'About Smart Template',
            fields: [
                { id: 'about-page-title', kind: 'title', label: 'Page Title', inputType: 'text' },
                { id: 'about-hero-title', kind: 'element', selector: '.tt-page-hero-title', attr: 'text', label: 'Hero Heading', inputType: 'textarea' },
                { id: 'about-hero-meta', kind: 'element', selector: '.text-center.mb-40 p:nth-of-type(1)', attr: 'text', label: 'Hero Meta Line', inputType: 'text' },
                { id: 'about-hero-subtitle', kind: 'element', selector: '.text-center.mb-40 p:nth-of-type(2)', attr: 'text', label: 'Hero Subtitle', inputType: 'textarea' },
                { id: 'about-mission-heading', kind: 'element', selector: 'section.mb-40 h2', attr: 'text', label: 'Mission Heading', inputType: 'text' },
                { id: 'about-mission-text-1', kind: 'element', selector: 'section.mb-40 .space-y-8 p:nth-of-type(1)', attr: 'text', label: 'Mission Paragraph 1', inputType: 'textarea' },
                { id: 'about-mission-text-2', kind: 'element', selector: 'section.mb-40 .space-y-8 p:nth-of-type(2)', attr: 'text', label: 'Mission Paragraph 2', inputType: 'textarea' },
                { id: 'about-team-heading', kind: 'element', selector: 'main section:last-of-type h2', attr: 'text', label: 'Team Section Label', inputType: 'text' }
            ]
        };
    }

    if (normalized === 'pages/contact.html') {
        return {
            name: 'Contact Smart Template',
            fields: [
                { id: 'contact-page-title', kind: 'title', label: 'Page Title', inputType: 'text' },
                { id: 'contact-hero-title', kind: 'element', selector: '.tt-page-hero-title', attr: 'text', label: 'Hero Heading', inputType: 'textarea' },
                { id: 'contact-hero-meta', kind: 'element', selector: '.text-center.mb-24 p:nth-of-type(1)', attr: 'text', label: 'Hero Meta Line', inputType: 'text' },
                { id: 'contact-hero-subtitle', kind: 'element', selector: '.text-center.mb-24 p:nth-of-type(2)', attr: 'text', label: 'Hero Subtitle', inputType: 'textarea' },
                { id: 'contact-submit-text', kind: 'element', selector: '#submit-button', attr: 'text', label: 'Submit Button Text', inputType: 'text' },
                { id: 'contact-modal-title', kind: 'element', selector: '#confirmation-modal h3', attr: 'text', label: 'Confirmation Title', inputType: 'textarea' },
                { id: 'contact-modal-body', kind: 'element', selector: '#confirmation-modal p', attr: 'text', label: 'Confirmation Message', inputType: 'textarea' },
                { id: 'contact-modal-button', kind: 'element', selector: '#close-modal', attr: 'text', label: 'Confirmation Button Text', inputType: 'text' }
            ]
        };
    }

    return null;
}

function extractSmartFieldsFromHtml(pagePath, html) {
    const template = getSmartTemplateConfig(pagePath);
    if (!template) return null;

    const doc = parseHtmlToDocument(html);
    const fields = template.fields.map((definition, index) => {
        if (definition.kind === 'title') {
            return {
                id: definition.id || `smart-title-${index + 1}`,
                kind: 'title',
                label: definition.label || 'Page Title',
                inputType: definition.inputType || 'text',
                value: doc.title || ''
            };
        }

        if (definition.kind === 'meta-description') {
            const meta = doc.querySelector('meta[name="description"]');
            return {
                id: definition.id || `smart-meta-${index + 1}`,
                kind: 'meta-description',
                label: definition.label || 'Meta Description',
                inputType: definition.inputType || 'textarea',
                value: meta ? meta.getAttribute('content') || '' : ''
            };
        }

        const node = definition.selector ? doc.querySelector(definition.selector) : null;
        const isTextField = definition.attr === 'text';
        return {
            id: definition.id || `smart-field-${index + 1}`,
            kind: 'element',
            selector: definition.selector || '',
            attr: definition.attr || 'text',
            label: definition.label || `Field ${index + 1}`,
            inputType: definition.inputType || 'text',
            value: node
                ? (isTextField ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : (node.getAttribute(definition.attr) || ''))
                : ''
        };
    });

    return {
        templateName: template.name,
        fields
    };
}

function serializeDocument(doc) {
    return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

function buildElementPath(element) {
    if (!element || !element.tagName) return '';
    if (element.id) return `#${element.id}`;

    const segments = [];
    let current = element;

    while (current && current.nodeType === 1 && current.tagName.toLowerCase() !== 'html') {
        const tag = current.tagName.toLowerCase();
        const parent = current.parentElement;
        if (!parent) {
            segments.unshift(tag);
            break;
        }

        const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
        const index = siblings.indexOf(current) + 1;
        segments.unshift(`${tag}:nth-of-type(${index})`);
        current = parent;
    }

    return segments.join(' > ');
}

function pushVisualField(fields, dedupe, field) {
    const key = `${field.selector || field.kind}:${field.attr || ''}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);
    fields.push(field);
}

function extractVisualFieldsFromHtml(html) {
    const doc = parseHtmlToDocument(html);
    const fields = [];
    const dedupe = new Set();

    pushVisualField(fields, dedupe, {
        id: 'doc-title',
        kind: 'title',
        label: 'Page Title',
        inputType: 'text',
        value: doc.title || ''
    });

    const metaDescription = doc.querySelector('meta[name="description"]');
    pushVisualField(fields, dedupe, {
        id: 'meta-description',
        kind: 'meta-description',
        label: 'Meta Description',
        inputType: 'textarea',
        value: metaDescription ? metaDescription.getAttribute('content') || '' : ''
    });

    const textSelectors = 'main h1, main h2, main h3, main p, section h1, section h2, section h3, section p, h1, h2, h3, p';
    const textNodes = Array.from(doc.querySelectorAll(textSelectors));
    let textCount = 0;

    for (const node of textNodes) {
        const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.length < 3) continue;
        const selector = buildElementPath(node);
        if (!selector) continue;

        textCount += 1;
        pushVisualField(fields, dedupe, {
            id: `text-${textCount}`,
            kind: 'element',
            selector,
            attr: 'text',
            label: `${node.tagName.toUpperCase()} Text ${textCount}`,
            inputType: text.length > 80 ? 'textarea' : 'text',
            value: text
        });

        if (textCount >= 18) break;
    }

    const linkNodes = Array.from(doc.querySelectorAll('a[href]')).filter((node) => {
        const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
        return text.length > 0;
    });

    let linkCount = 0;
    for (const node of linkNodes) {
        const selector = buildElementPath(node);
        if (!selector) continue;
        const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
        const href = node.getAttribute('href') || '';

        linkCount += 1;
        pushVisualField(fields, dedupe, {
            id: `link-text-${linkCount}`,
            kind: 'element',
            selector,
            attr: 'text',
            label: `Link Text ${linkCount}`,
            inputType: 'text',
            value: text
        });
        pushVisualField(fields, dedupe, {
            id: `link-href-${linkCount}`,
            kind: 'element',
            selector,
            attr: 'href',
            label: `Link URL ${linkCount}`,
            inputType: 'text',
            value: href
        });

        if (linkCount >= 6) break;
    }

    const imageNodes = Array.from(doc.querySelectorAll('img[src]'));
    let imageCount = 0;
    for (const node of imageNodes) {
        const selector = buildElementPath(node);
        if (!selector) continue;

        imageCount += 1;
        pushVisualField(fields, dedupe, {
            id: `image-src-${imageCount}`,
            kind: 'element',
            selector,
            attr: 'src',
            label: `Image Source ${imageCount}`,
            inputType: 'text',
            value: node.getAttribute('src') || ''
        });
        pushVisualField(fields, dedupe, {
            id: `image-alt-${imageCount}`,
            kind: 'element',
            selector,
            attr: 'alt',
            label: `Image Alt ${imageCount}`,
            inputType: 'text',
            value: node.getAttribute('alt') || ''
        });

        if (imageCount >= 6) break;
    }

    return fields;
}

function applyVisualFieldsToHtml(html, fields) {
    const doc = parseHtmlToDocument(html);

    fields.forEach((field) => {
        if (field.kind === 'title') {
            doc.title = field.value || '';
            return;
        }

        if (field.kind === 'meta-description') {
            let meta = doc.querySelector('meta[name="description"]');
            if (!meta) {
                meta = doc.createElement('meta');
                meta.setAttribute('name', 'description');
                if (doc.head) {
                    doc.head.appendChild(meta);
                }
            }
            if (meta) {
                meta.setAttribute('content', field.value || '');
            }
            return;
        }

        if (!field.selector) return;
        const node = doc.querySelector(field.selector);
        if (!node) return;

        if (field.attr === 'text') {
            node.textContent = field.value || '';
        } else {
            node.setAttribute(field.attr, field.value || '');
        }
    });

    return serializeDocument(doc);
}

function renderVisualFields() {
    if (!editorEls.visualFields) return;

    if (!Array.isArray(editorState.visualFields) || editorState.visualFields.length === 0) {
        editorEls.visualFields.innerHTML = '<p class="text-xs text-gray-400">No quick fields found for this page. Switch to HTML Code mode to edit directly.</p>';
        return;
    }

    const templateNote = editorState.smartTemplateName
        ? `<div class="p-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-xs text-emerald-200">Using ${escapeHtml(editorState.smartTemplateName)} for this page.</div>`
        : '';

    editorEls.visualFields.innerHTML = templateNote + editorState.visualFields.map((field, index) => {
        const safeLabel = escapeHtml(field.label || `Field ${index + 1}`);
        const safeValue = escapeHtml(field.value || '');
        const inputId = `visual-field-${index}`;
        const hint = field.selector ? `<p class="text-[10px] text-gray-500 mt-1">${escapeHtml(field.selector)}</p>` : '';

        if (field.inputType === 'textarea') {
            return `
                <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                    <label for="${inputId}" class="block text-xs font-semibold text-white/90 mb-1">${safeLabel}</label>
                    <textarea id="${inputId}" data-field-index="${index}" rows="3"
                        class="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:bg-black/30 transition-all">${safeValue}</textarea>
                    ${hint}
                </div>
            `;
        }

        return `
            <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                <label for="${inputId}" class="block text-xs font-semibold text-white/90 mb-1">${safeLabel}</label>
                <input id="${inputId}" data-field-index="${index}" type="text" value="${safeValue}"
                    class="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:bg-black/30 transition-all">
                ${hint}
            </div>
        `;
    }).join('');

    editorEls.visualFields.querySelectorAll('[data-field-index]').forEach((inputEl) => {
        inputEl.addEventListener('input', () => {
            const index = Number(inputEl.dataset.fieldIndex);
            if (!Number.isInteger(index) || !editorState.visualFields[index]) return;

            editorState.visualFields[index].value = inputEl.value;
            if (editorEls.content) {
                editorEls.content.value = applyVisualFieldsToHtml(editorEls.content.value, editorState.visualFields);
                markEditorDirty(true);
            }
        });
    });
}

function regenerateVisualFieldsFromSource(markDirtyAfter = false) {
    if (!editorEls.content) return;
    const html = editorEls.content.value || '';

    const smart = extractSmartFieldsFromHtml(editorState.selectedPath, html);
    if (smart && Array.isArray(smart.fields) && smart.fields.length > 0) {
        editorState.smartTemplateName = smart.templateName || '';
        editorState.visualFields = smart.fields;
    } else {
        editorState.smartTemplateName = '';
        editorState.visualFields = extractVisualFieldsFromHtml(html);
    }

    renderVisualFields();

    if (markDirtyAfter) {
        markEditorDirty(true);
    }
}

function renderPageList() {
    if (!editorEls.pageList) return;

    if (!Array.isArray(editorState.pages) || editorState.pages.length === 0) {
        editorEls.pageList.innerHTML = '<p class="text-sm text-gray-400 py-4">No editable pages found.</p>';
        return;
    }

    editorEls.pageList.innerHTML = editorState.pages.map((page) => {
        const isActive = page.path === editorState.selectedPath;
        return `
            <button
                type="button"
                data-page-path="${escapeHtml(page.path)}"
                class="w-full text-left p-3 rounded-xl border transition-all ${isActive ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}"
            >
                <p class="text-xs font-bold">${escapeHtml(page.name || page.path)}</p>
                <p class="text-[11px] opacity-75 mt-1">${escapeHtml(page.path)}</p>
            </button>
        `;
    }).join('');

    editorEls.pageList.querySelectorAll('button[data-page-path]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const pagePath = btn.dataset.pagePath;
            if (pagePath) loadEditablePageContent(pagePath);
        });
    });
}

async function loadEditablePages() {
    const token = getToken();
    if (!token) {
        setHelperStatus('Session expired. Please login again.', 'error');
        return;
    }

    try {
        setHelperStatus('Loading editable pages...');
        const response = await fetch(`${apiBase}/editor/pages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            window.location.href = '/pages/login.html';
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load editable pages');
        }

        editorState.pages = Array.isArray(data.pages) ? data.pages : [];
        renderPageList();
        setHelperStatus(`Loaded ${editorState.pages.length} editable pages.`, 'success');

        if (!editorState.selectedPath && editorState.pages.length > 0) {
            loadEditablePageContent(editorState.pages[0].path);
        }
    } catch (error) {
        console.error('Error loading editable pages:', error);
        setHelperStatus(error.message || 'Failed to load pages', 'error');
        window.showToast('Failed to load editable pages', 'error');
    }
}

async function loadEditablePageContent(pagePath) {
    const token = getToken();
    if (!token) return;

    if (editorState.dirty) {
        const ok = window.confirm('You have unsaved changes. Discard them and open another page?');
        if (!ok) return;
    }

    try {
        editorState.loading = true;
        markEditorDirty(false);
        setEditorStatus('Loading page...');

        const response = await fetch(`${apiBase}/editor/page?path=${encodeURIComponent(pagePath)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            window.location.href = '/pages/login.html';
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load page content');
        }

        editorState.selectedPath = data.path || pagePath;
        if (editorEls.selectedPath) editorEls.selectedPath.textContent = editorState.selectedPath;
        if (editorEls.content) editorEls.content.value = data.content || '';

        editorState.visualFields = [];
        regenerateVisualFieldsFromSource(false);
        setPreviewLink(editorState.selectedPath);
        setPageEditorViewMode(editorState.viewMode);
        renderPageList();
        setEditorStatus('Page loaded.');
        setHelperStatus(`Editing ${editorState.selectedPath}`);
    } catch (error) {
        console.error('Error loading page content:', error);
        setEditorStatus(error.message || 'Failed to load page', 'error');
        window.showToast('Failed to load page content', 'error');
    } finally {
        editorState.loading = false;
        markEditorDirty(false);
    }
}

async function saveEditablePageContent() {
    const token = getToken();
    if (!token || !editorState.selectedPath) return;

    const saveButton = editorEls.saveBtn;
    const originalText = saveButton ? saveButton.textContent : 'Save Page';

    try {
        editorState.loading = true;
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
        }
        setEditorStatus('Saving page...');

        const response = await fetch(`${apiBase}/editor/page?path=${encodeURIComponent(editorState.selectedPath)}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: editorEls.content ? editorEls.content.value : '' })
        });

        if (response.status === 401) {
            window.location.href = '/pages/login.html';
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to save page');
        }

        markEditorDirty(false);
        setEditorStatus('Page saved successfully.', 'success');
        setHelperStatus(`Saved ${editorState.selectedPath}`, 'success');
        window.showToast('Page saved successfully', 'success');
        await loadEditablePages();
    } catch (error) {
        console.error('Error saving page content:', error);
        setEditorStatus(error.message || 'Failed to save page', 'error');
        setHelperStatus(error.message || 'Save failed', 'error');
        window.showToast('Failed to save page', 'error');
    } finally {
        editorState.loading = false;
        if (saveButton) {
            saveButton.textContent = originalText;
        }
        markEditorDirty(editorState.dirty);
    }
}

async function loadPosts() {
    const token = getToken();
    try {
        const response = await fetch(`${apiBase}/blog`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        posts = Array.isArray(data) ? data : (data.posts || data.items || []);
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
                ${post.imageUrl ? `<img src="${post.imageUrl}" onerror="this.onerror=null;this.src='/public/images/space-bg.png'" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">` : `
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
                <p class="text-sm text-gray-400 mb-6 line-clamp-2 leading-relaxed">${String(post.content || '').substring(0, 100)}...</p>
                <div class="flex justify-between items-center pt-4 border-t border-white/5">
                    <span class="text-xs text-gray-500">${new Date(post.createdAt || post.created_at || Date.now()).toLocaleDateString()}</span>
                    <div class="flex space-x-2">
                        <button onclick="editPost('${post._id || post.id}')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all">
                            <i data-lucide="edit-3" class="w-4 h-4"></i>
                        </button>
                        <button onclick="deletePost('${post._id || post.id}')" class="w-10 h-10 iphone-glass rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all">
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
        const post = posts.find(p => String(p._id || p.id) === String(postId));
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
    const token = getToken();
    const form = event.target;
    const publishButton = form.querySelector('button[type="submit"]');
    const originalText = publishButton.textContent;

    publishButton.disabled = true;
    publishButton.textContent = 'Publishing...';

    const fileInput = document.getElementById('postImageUploadInput');
    let imageUrl = form.imageUrl.value;
    let imageUrls = [];

    if (fileInput.files.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
        }

        try {
            const uploadResponse = await fetch(`${apiBase}/upload/multi`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (uploadResponse.ok) {
                const uploadData = await uploadResponse.json();
                imageUrls = uploadData.imageUrls;
                if (imageUrls.length > 0) {
                    imageUrl = imageUrls[0];
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
        imageUrl,
        imageUrls
    };

    try {
        const url = editingPostId
            ? `${apiBase}/blog/${editingPostId}`
            : `${apiBase}/blog`;
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

async function deletePost(id) {
    console.log(`[CRITICAL ACTION: POST DELETE] Requesting deletion of post ID: ${id}.`);
    window.showToast('Deletion requested. Please check server logs for confirmation.', 'info');

    const token = getToken();
    try {
        const response = await fetch(`${apiBase}/blog/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            window.showToast('Post deleted successfully', 'success');
            loadPosts();
        } else {
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

window.openPostModal = openPostModal;
window.closePostModal = closePostModal;
window.savePost = savePost;
window.deletePost = deletePost;
window.editPost = editPost;

// Preview event listener + page editor wiring
document.addEventListener('DOMContentLoaded', () => {
    editorEls.tabBlog = document.getElementById('tab-blog');
    editorEls.tabPages = document.getElementById('tab-pages');
    editorEls.blogView = document.getElementById('blog-manager-view');
    editorEls.pagesView = document.getElementById('page-editor-view');
    editorEls.pageList = document.getElementById('editor-page-list');
    editorEls.selectedPath = document.getElementById('editor-selected-path');
    editorEls.content = document.getElementById('editor-page-content');
    editorEls.saveBtn = document.getElementById('save-page-btn');
    editorEls.refreshBtn = document.getElementById('refresh-pages-btn');
    editorEls.previewLink = document.getElementById('preview-page-link');
    editorEls.status = document.getElementById('editor-save-status');
    editorEls.helperStatus = document.getElementById('content-manager-status');
    editorEls.visualWrapper = document.getElementById('editor-visual-wrapper');
    editorEls.visualFields = document.getElementById('editor-visual-fields');
    editorEls.viewVisualBtn = document.getElementById('editor-view-visual');
    editorEls.viewCodeBtn = document.getElementById('editor-view-code');
    editorEls.regenerateBtn = document.getElementById('regenerate-visual-btn');
    editorEls.modeLabel = document.getElementById('editor-mode-label');

    if (editorEls.tabBlog) editorEls.tabBlog.addEventListener('click', () => switchEditorMode('blog'));
    if (editorEls.tabPages) editorEls.tabPages.addEventListener('click', () => switchEditorMode('pages'));
    if (editorEls.refreshBtn) editorEls.refreshBtn.addEventListener('click', loadEditablePages);
    if (editorEls.saveBtn) editorEls.saveBtn.addEventListener('click', saveEditablePageContent);

    if (editorEls.viewVisualBtn) {
        editorEls.viewVisualBtn.addEventListener('click', () => setPageEditorViewMode('visual'));
    }
    if (editorEls.viewCodeBtn) {
        editorEls.viewCodeBtn.addEventListener('click', () => setPageEditorViewMode('code'));
    }
    if (editorEls.regenerateBtn) {
        editorEls.regenerateBtn.addEventListener('click', () => {
            regenerateVisualFieldsFromSource(false);
            setEditorStatus('Visual fields regenerated.');
        });
    }

    if (editorEls.content) {
        editorEls.content.addEventListener('input', () => {
            if (!editorState.selectedPath) return;
            markEditorDirty(true);
        });
    }

    updateTabsUI();
    setPageEditorViewMode('visual');
    setPreviewLink('');
    setEditorStatus('Ready');

    const fileInput = document.getElementById('postImageUploadInput');
    const container = document.getElementById('postImagePreviewContainer');

    if (fileInput && container) {
        fileInput.addEventListener('change', function () {
            container.innerHTML = '';
            if (this.files && this.files.length > 0) {
                container.classList.remove('hidden');
                Array.from(this.files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'w-full h-24 object-cover rounded-lg border border-gray-700';
                        container.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                container.classList.add('hidden');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', loadPosts);
