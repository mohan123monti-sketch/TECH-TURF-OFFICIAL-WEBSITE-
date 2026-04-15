document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('team-grid');
    if (!grid) return;

    const roleTitles = {
        superadmin: 'Chief Architect',
        admin: 'Operations Lead',
        content_manager: 'Content Strategist',
        product_manager: 'Product Architect',
        support_agent: 'Support Lead',
        user: 'Team Member'
    };

    const roleBios = {
        superadmin: 'Leads company-wide architecture, strategy, and execution across all divisions.',
        admin: 'Coordinates cross-functional operations and ensures reliable delivery pipelines.',
        content_manager: 'Designs messaging systems, editorial direction, and brand storytelling.',
        product_manager: 'Shapes product vision, roadmap priorities, and feature outcomes.',
        support_agent: 'Builds trust through responsive support and service quality standards.',
        user: 'Contributes to building resilient systems and exceptional digital experiences.'
    };

    const defaultTeam = [];

    const buildCard = (member, index) => {
        const safeName = member.name || 'Team Member';
        const safeRole = member.role || 'user';
        const roleLabel = roleTitles[safeRole] || safeRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const roleBio = roleBios[safeRole] || roleBios.user;
        const avatar = member.avatar || '/public/images/space-bg.png';

        return `
            <div class="iphone-glass p-12 text-center reveal-hidden rounded-[3rem] border border-white/5 shadow-2xl" style="transition-delay: ${Math.min(index, 5) * 0.1}s;">
                <div class="relative w-40 h-40 mx-auto mb-10 group">
                    <img class="relative w-full h-full rounded-[2.5rem] border border-white/10 p-1 bg-white/5 object-cover" src="${avatar}" alt="${safeName}">
                </div>
                <h3 class="text-3xl font-black mb-2 text-white tracking-tighter leading-none uppercase">${safeName}</h3>
                <p class="text-[10px] font-black text-white/40 mb-8 uppercase tracking-[0.3em]">${roleLabel}</p>
                <p class="text-gray-400 text-sm font-medium leading-relaxed opacity-70">${roleBio}</p>
            </div>
        `;
    };

    const render = (members) => {
        if (!Array.isArray(members) || members.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-12">No team profiles available.</div>';
            return;
        }

        grid.innerHTML = members.map((member, index) => buildCard(member, index)).join('');
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    };

    try {
        const apiBase = window.API_BASE_URL || window.__TECHTURF_API_BASE__ || '/api';
        const response = await fetch(`${apiBase}/auth/team`);

        if (!response.ok) {
            throw new Error(`Failed to load team: ${response.status}`);
        }

        const team = await response.json();
        const members = Array.isArray(team) && team.length > 0 ? team : defaultTeam;
        render(members.slice(0, 6));
    } catch (error) {
        console.error('Team load error:', error);
        render(defaultTeam);
    }
});
