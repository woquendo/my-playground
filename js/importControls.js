// Import controls management
export function setupImportControls() {
    const showImportBtn = document.getElementById('show-import-btn');
    const importControls = document.querySelector('.import-controls');

    if (showImportBtn && importControls) {
        showImportBtn.addEventListener('click', () => {
            const isVisible = importControls.style.display !== 'none';
            importControls.style.display = isVisible ? 'none' : 'block';
            showImportBtn.textContent = isVisible ? 'Import/Settings' : 'Hide Import';
        });
    }
}