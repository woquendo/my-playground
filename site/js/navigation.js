// Page navigation
export function showPage(name) {
    document.querySelectorAll('.page').forEach(el => el.style.display = 'none');
    const el = document.getElementById('page-' + name);
    if (el) el.style.display = '';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-page="${name}"]`);
    if (btn) btn.classList.add('active');
}

export function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.addEventListener('click', () => showPage(b.dataset.page));
    });
    // default page
    showPage('songs');
}