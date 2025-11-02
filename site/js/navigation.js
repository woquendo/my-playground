// Page navigation
export function showPage(name) {
    document.querySelectorAll('.page').forEach(el => el.style.display = 'none');
    const el = document.getElementById('page-' + name);
    if (el) el.style.display = '';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
    if (btn) btn.classList.add('active');
    // Add page class to container for styling
    const container = document.querySelector('.container.main');
    if (container) {
        container.className = 'container main page-' + name;
    }
    // Remember last selected page
    localStorage.setItem('lastPage', name);
}

export function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.addEventListener('click', () => showPage(b.dataset.page));
    });
    // Restore last page or default to songs
    const lastPage = localStorage.getItem('lastPage') || 'songs';
    showPage(lastPage);
}