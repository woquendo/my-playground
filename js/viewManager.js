// View management (grid/list toggle) functionality
export function createViewToggle(initialView = 'grid', onViewChange = null) {
    const viewToggle = document.createElement('div');
    viewToggle.className = 'view-toggle';
    viewToggle.innerHTML = `
        <button class="btn small view-btn${initialView === 'grid' ? ' active' : ''}" data-view="grid">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
            </svg>
        </button>
        <button class="btn small view-btn${initialView === 'list' ? ' active' : ''}" data-view="list">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        </button>
    `;

    // Setup view toggle event listener
    viewToggle.addEventListener('click', (e) => {
        if (e.target.closest('.view-btn')) {
            const btn = e.target.closest('.view-btn');
            viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const newView = btn.dataset.view;
            if (onViewChange) {
                onViewChange(newView);
            }
        }
    });

    return viewToggle;
}

export function setViewToggleState(viewToggle, currentView) {
    viewToggle.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === currentView);
    });
}

export function setContainerView(container, view) {
    if (container) {
        container.className = `shows-${view}`;
    }
}