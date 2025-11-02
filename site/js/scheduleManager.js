// Schedule management functionality
import { setContainerView } from './viewManager.js';

export function formatDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function calculateCurrentEpisode(show, selectedDate) {
    if (!show.start_date || !selectedDate) return 1;

    const startDate = new Date(show.start_date);
    const targetDate = new Date(selectedDate);
    const weeksDiff = Math.floor((targetDate - startDate) / (7 * 24 * 60 * 60 * 1000));
    return weeksDiff + 1;
}

export function createScheduleControls(currentDate, onDateChange) {
    const controls = document.createElement('div');
    controls.className = 'schedule-controls';

    // Get week days
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + i);
        weekDays.push(date);
    }

    controls.innerHTML = `
        <div class="date-nav">
            <button class="btn small" id="prev-week">&laquo; Previous Week</button>
            <input type="date" id="date-picker" value="${currentDate.toISOString().split('T')[0]}">
            <button class="btn small" id="next-week">Next Week &raquo;</button>
        </div>
        <div class="week-buttons">
            ${weekDays.map(date => `
                <button class="btn small date-btn${date.getTime() === currentDate.getTime() ? ' active' : ''}" 
                        data-date="${date.toISOString()}">
                    ${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()}
                </button>
            `).join('')}
        </div>
    `;

    return controls;
}

export function setupScheduleEventListeners(controls, currentDate, onDateChange) {
    controls.querySelector('#prev-week').onclick = () => {
        currentDate.setDate(currentDate.getDate() - 7);
        onDateChange(currentDate);
    };

    controls.querySelector('#next-week').onclick = () => {
        currentDate.setDate(currentDate.getDate() + 7);
        onDateChange(currentDate);
    };

    controls.querySelector('#date-picker').onchange = (e) => {
        const newDate = new Date(e.target.value);
        currentDate.setTime(newDate.getTime());
        onDateChange(currentDate);
    };

    controls.querySelector('.week-buttons').onclick = (e) => {
        const btn = e.target.closest('.date-btn');
        if (!btn) return;

        controls.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedDate = new Date(btn.dataset.date);
        onDateChange(selectedDate);
    };
}

export function renderSchedule(shows, container, selectedDate, currentView, itemsPerPage = 20) {
    const airingShows = filterAiringShows(shows, selectedDate);

    container.innerHTML = '';

    if (airingShows.length === 0) {
        container.innerHTML = '<div class="small">No shows airing on this date.</div>';
        return;
    }

    setContainerView(container, currentView);

    // Pagination setup
    const startIndex = 0; // For now, we'll just show first page
    const paginatedShows = airingShows.slice(startIndex, startIndex + itemsPerPage);

    paginatedShows.forEach(show => {
        const div = document.createElement('div');
        div.className = `show-item show-item-${currentView}`;
        const episode = calculateCurrentEpisode(show, selectedDate);

        // Create edit button for air day
        const editBtn = document.createElement('button');
        editBtn.className = 'btn small edit-air-day';
        editBtn.title = 'Edit air day';
        editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';

        setupAirDayEditor(editBtn, show, selectedDate, () => renderSchedule(shows, container, selectedDate, currentView, itemsPerPage));

        if (show.image_url) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'show-image';
            imgContainer.innerHTML = `<img src="${show.image_url}" alt="${show.title}" loading="lazy">`;
            div.appendChild(imgContainer);
        }

        const content = document.createElement('div');
        content.className = 'show-content';
        content.innerHTML = `
            <strong>${show.url ? `<a href="${show.url}" target="_blank" rel="noopener noreferrer">${show.title}</a>` : show.title}</strong>
            <div class="small metadata-row">
                Episode ${episode}${show.episodes ? ` of ${show.episodes}` : ''} • 
                <span class="air-day-edit">${formatDate(selectedDate)}</span>
            </div>
        `;

        div.appendChild(content);
        div.appendChild(editBtn);
        container.appendChild(div);
    });
}

function filterAiringShows(shows, selectedDate) {
    return shows.filter(show => {
        // Only include shows that are watching or plan to watch
        const status = (show.status || '').toLowerCase();
        if (status !== 'watching' && status !== 'plan_to_watch') return false;

        // Only shows marked as currently airing
        if (show.airing_status !== 1) return false;

        // Calculate air date for this show
        const airDate = new Date(show.start_date);
        if (!airDate || isNaN(airDate.getTime())) return false;

        // Get day of week for the show and selected date
        const showDay = show.custom_air_day || airDate.getDay();
        const selectedDay = new Date(selectedDate).getDay();

        // Must match the day of week and be after start date
        return showDay === selectedDay && new Date(selectedDate) >= airDate;
    });
}

function setupAirDayEditor(editBtn, show, selectedDate, onUpdate) {
    editBtn.onclick = () => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = show.custom_air_day || new Date(show.start_date).getDay();

        const select = document.createElement('select');
        select.innerHTML = days.map((day, idx) =>
            `<option value="${idx}" ${idx === currentDay ? 'selected' : ''}>${day}</option>`
        ).join('');

        select.onchange = (e) => {
            show.custom_air_day = parseInt(e.target.value);
            onUpdate();
        };

        const container = editBtn.parentElement.querySelector('.air-day-edit');
        container.innerHTML = '';
        container.appendChild(select);
    };
}