// Schedule management functionality
import { createViewToggle, setContainerView } from './viewManager.js';

// Helper function to get schedule updates and apply them to shows
async function applyScheduleUpdates(shows) {
    const localUpdates = JSON.parse(localStorage.getItem('schedule_updates') || '{"updates":{}}');
    let serverUpdates = { updates: {} };
    try {
        const res = await fetch('./data/schedule_updates.json?t=' + Date.now());
        if (res.ok) {
            serverUpdates = await res.json();
        }
    } catch (e) {
        console.warn('Failed to load schedule updates from server:', e);
    }
    const updates = {
        updates: { ...serverUpdates.updates, ...localUpdates.updates }
    };

    // Clean up any legacy custom_air_day entries
    Object.keys(updates.updates).forEach(showId => {
        const update = updates.updates[showId];
        if (update && typeof update === 'object' && update.custom_air_day !== undefined) {
            console.log(`Removing legacy custom_air_day from show ${showId}`);
            delete update.custom_air_day;
        }
    });

    // Debug logging for schedule updates
    console.log('Server updates:', serverUpdates);
    console.log('Local updates:', localUpdates);
    console.log('Merged updates:', updates);
    return shows.map(show => {
        const update = updates.updates[show.id];
        if (update) {
            const updatedShow = { ...show };
            if (typeof update === 'object') {
                // Apply schedule update properties
                if (typeof update.custom_start_date === 'string' && /^(\d{1,2})-(\d{1,2})-(\d{2})$/.test(update.custom_start_date)) {
                    console.log(`APPLYING custom_start_date for show ${show.id}: ${update.custom_start_date}`);
                    updatedShow.custom_start_date = update.custom_start_date;
                } else if (update.custom_start_date !== undefined) {
                    console.log(`FAILED to apply custom_start_date for show ${show.id}: value="${update.custom_start_date}", type=${typeof update.custom_start_date}, regex=${/^(\d{1,2})-(\d{1,2})-(\d{2})$/.test(update.custom_start_date)}`);
                }
                if (typeof update.custom_episodes === 'number' && update.custom_episodes > 0) {
                    updatedShow.custom_episodes = update.custom_episodes;
                }
                if (typeof update.skipped_weeks === 'number' && update.skipped_weeks >= 0) {
                    updatedShow.skipped_weeks = update.skipped_weeks;
                }
            }

            // Debug logging for specific show
            if (show.id === 61174) {
                console.log(`Processing show 61174:`, {
                    originalShow: show,
                    update: update,
                    updatedShow: updatedShow,
                    customStartDateFromUpdate: update.custom_start_date,
                    customStartDateType: typeof update.custom_start_date,
                    regexTest: /^(\d{2})-(\d{2})-(\d{2})$/.test(update.custom_start_date)
                });
            }

            return updatedShow;
        }
        return show;
    });
}

export function formatDate(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function calculateCurrentEpisode(show, selectedDate) {
    if (!show.start_date || !selectedDate) return 1;

    // Use custom start date if available, otherwise use original start date
    const startDateStr = show.custom_start_date || show.start_date;
    const [month, day, year] = startDateStr.split('-').map(Number);
    const startDate = new Date(2000 + year, month - 1, day);
    const targetDate = new Date(selectedDate);
    const weeksDiff = Math.floor((targetDate - startDate) / (7 * 24 * 60 * 60 * 1000));

    // Account for skipped weeks
    const skippedWeeks = show.skipped_weeks || 0;
    const adjustedEpisode = weeksDiff - skippedWeeks + 1;

    return Math.max(1, adjustedEpisode); // Don't go below episode 1
}

export function createScheduleControls(currentDate, selectedDate = null) {
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
            <input type="date" id="date-picker" value="${selectedDate ? selectedDate.toISOString().split('T')[0] : currentDate.toISOString().split('T')[0]}">
            <button class="btn small" id="next-week">Next Week &raquo;</button>
        </div>
        <div class="week-buttons">
            ${weekDays.map(date => `
                <button class="btn small date-btn${selectedDate && date.getTime() === selectedDate.getTime() ? ' active' : ''}" 
                        data-date="${date.toISOString()}">
                    ${date.toLocaleDateString('en-US', { weekday: 'short' })} ${date.getDate()}
                </button>
            `).join('')}
        </div>
    `;

    return controls;
}

export function setupScheduleEventListeners(controls, currentDate, onAction) {
    controls.querySelector('#prev-week').onclick = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        onAction('prev-week', newDate);
    };

    controls.querySelector('#next-week').onclick = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        onAction('next-week', newDate);
    };

    controls.querySelector('#date-picker').onchange = (e) => {
        const newDate = new Date(e.target.value);
        onAction('date-pick', newDate);
    };

    controls.querySelector('.week-buttons').onclick = (e) => {
        const btn = e.target.closest('.date-btn');
        if (!btn) return;

        controls.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedDate = new Date(btn.dataset.date);
        onAction('day-select', selectedDate);
    };
}

export async function renderSchedule(shows, container, selectedDate, currentView, itemsPerPage = 20) {
    // Apply schedule updates to shows
    const updatedShows = await applyScheduleUpdates(shows);

    const airingShows = filterAiringShows(updatedShows, selectedDate);

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

        setupAirDayEditor(editBtn, show, selectedDate, async () => await renderSchedule(updatedShows, container, selectedDate, currentView, itemsPerPage));

        if (show.image_url) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'show-image';
            imgContainer.innerHTML = `<img src="${show.image_url}" alt="${show.title}" loading="lazy">`;
            div.appendChild(imgContainer);
        }

        const content = document.createElement('div');
        content.className = 'show-content';
        // Use custom episodes if available, otherwise use original episodes (default to 12 if null)
        const totalEpisodes = show.custom_episodes !== undefined ? show.custom_episodes : (show.episodes || 12);
        const displayTitle = show.title_english || show.title || 'Untitled';
        content.innerHTML = `
            <strong>${show.url ? `<a href="${show.url}" target="_blank" rel="noopener noreferrer">${displayTitle}</a>` : displayTitle}</strong>
            <div class="small metadata-row">
                Episode ${episode}${totalEpisodes ? ` of ${totalEpisodes}` : ''} • 
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

        // Use custom episodes if available, otherwise use original episodes (default to 12 if null)
        const totalEpisodes = show.custom_episodes !== undefined ? show.custom_episodes : (show.episodes || 12);
        if (!totalEpisodes) return false;

        // Use custom start date if available, otherwise use original start date
        const startDateStr = show.custom_start_date || show.start_date;
        const [month, day, year] = startDateStr.split('-').map(Number);
        const airDate = new Date(2000 + year, month - 1, day);
        if (!airDate || isNaN(airDate.getTime())) return false;

        // Get day of week for the show and selected date
        const showDay = airDate.getDay();
        const selectedDay = new Date(selectedDate).getDay();

        // Debug logging for shows with custom dates
        if (show.custom_start_date) {
            console.log(`Show ${show.id} (${show.title}): custom_start_date=${show.custom_start_date}, showDay=${showDay}, selectedDay=${selectedDay}, airDate=${airDate.toDateString()}, selectedDate=${new Date(selectedDate).toDateString()}`);
        }

        // Must match the day of week and be after start date
        return showDay === selectedDay && new Date(selectedDate) >= airDate;
    });
}

export async function renderScheduleContent(shows, container, selectedDate, view, titles = {}) {
    container.innerHTML = '';
    const date = new Date(selectedDate);

    // Apply schedule updates to shows
    const updatedShows = await applyScheduleUpdates(shows);

    const dayShows = updatedShows.filter(show => {
        // Debug show 61174 specifically
        const isShow61174 = show.id === 61174;

        if (!show.start_date && !show.custom_start_date) {
            if (isShow61174) console.log(`Show 61174 filtered out: no start date`);
            return false;
        }

        // Only include shows that are watching or plan to watch
        const status = (show.status || '').toLowerCase();
        if (status !== 'watching' && status !== 'plan_to_watch') {
            if (isShow61174) console.log(`Show 61174 filtered out: status=${status}`);
            return false;
        }

        // Only shows marked as currently airing
        if (show.airing_status !== 1) {
            if (isShow61174) console.log(`Show 61174 filtered out: airing_status=${show.airing_status}`);
            return false;
        }

        // Use custom episodes if available, otherwise use original episodes (default to 12 if null)
        const totalEpisodes = show.custom_episodes !== undefined ? show.custom_episodes : (show.episodes || 12);
        if (!totalEpisodes) {
            if (isShow61174) console.log(`Show 61174 filtered out: no episodes (${totalEpisodes})`);
            return false;
        }

        // Use custom start date if available, otherwise use original start date
        const startDateStr = show.custom_start_date || show.start_date;
        const [month, day, year] = startDateStr.split('-').map(Number);
        const startDate = new Date(2000 + year, month - 1, day);
        const daysSinceStart = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
        if (daysSinceStart < 0) {
            if (isShow61174) console.log(`Show 61174 filtered out: daysSinceStart=${daysSinceStart} (too early)`);
            return false;
        }

        // Account for skipped weeks in episode calculation
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        const skippedWeeks = show.skipped_weeks || 0;
        const episode = weeksSinceStart - skippedWeeks + 1;

        if (episode > totalEpisodes || episode < 1) {
            if (isShow61174) console.log(`Show 61174 filtered out: episode=${episode}, totalEpisodes=${totalEpisodes}`);
            return false;
        }

        const airingDay = startDate.getDay();

        // Debug logging for shows with custom dates
        if (show.custom_start_date || isShow61174) {
            console.log(`RenderScheduleContent - Show ${show.id} (${show.title}): custom_start_date=${show.custom_start_date}, airingDay=${airingDay}, dateDay=${date.getDay()}, startDate=${startDate.toDateString()}, selectedDate=${date.toDateString()}, episode=${episode}`);
        }

        const shouldShow = date.getDay() === airingDay;
        if (isShow61174) console.log(`Show 61174 final result: shouldShow=${shouldShow} (airingDay=${airingDay}, dateDay=${date.getDay()})`);

        return shouldShow;
    });
    if (dayShows.length === 0) {
        container.innerHTML = '<div class="small">No shows scheduled for this date.</div>';
        return;
    }
    const dateDiv = document.createElement('div');
    dateDiv.className = 'schedule-date';
    dateDiv.innerHTML = `<h3>${date.toDateString()}</h3>`;
    container.appendChild(dateDiv);
    const showsDiv = document.createElement('div');
    showsDiv.className = `shows-${view}`;
    dayShows.forEach(show => {
        const div = document.createElement('div');
        div.className = `show-item show-item-${view}`;
        const title = titles[show.id] || show.title_english || show.title || show.name || 'Untitled';
        const url = show.url || '';
        if (show.image_url) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'show-image';
            const imgHtml = show.url ? `<a href="${show.url}" target="_blank" rel="noopener noreferrer"><img src="${show.image_url}" alt="${title}" loading="lazy"></a>` : `<img src="${show.image_url}" alt="${title}" loading="lazy">`;
            imgContainer.innerHTML = imgHtml;
            div.appendChild(imgContainer);
        }
        const meta = url ? `<a href="${show.url}" target="_blank" rel="noopener noreferrer">${title}</a>` : title;

        // Use custom start date if available, otherwise use original start date
        const startDateStr = show.custom_start_date || show.start_date;
        const [month, day, year] = startDateStr.split('-').map(Number);
        const startDate = new Date(2000 + year, month - 1, day);

        // Account for skipped weeks in episode calculation
        const daysSinceStart = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        const skippedWeeks = show.skipped_weeks || 0;
        const episode = Math.max(1, weeksSinceStart - skippedWeeks + 1);

        // Use custom episodes if available, otherwise use original episodes (default to 12 if null)
        const totalEpisodes = show.custom_episodes !== undefined ? show.custom_episodes : (show.episodes || 12);
        const infoContainer = document.createElement('div');
        infoContainer.className = 'show-info';
        infoContainer.innerHTML = `
            <strong class="show-title">${meta}</strong>
            <div class="show-details">
                ${totalEpisodes ? `<span class="episodes">Episode ${episode} of ${totalEpisodes}</span>` : ''}
            </div>
            <div class="show-meta small">
                ${show.type ? `<span>${show.type}</span>` : ''}
                <span class="air-day-edit"></span>
            </div>
        `;
        div.appendChild(infoContainer);
        // Create edit button for air day
        const editBtn = document.createElement('button');
        editBtn.className = 'btn small edit-air-day';
        editBtn.title = 'Edit air day';
        editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
        setupAirDayEditor(editBtn, show, selectedDate, async () => await renderScheduleContent(updatedShows, container, selectedDate, view, titles));
        div.appendChild(editBtn);
        showsDiv.appendChild(div);
    });
    container.appendChild(showsDiv);
}

function setupAirDayEditor(editBtn, show, selectedDate, onUpdate) {
    editBtn.onclick = () => {
        // Create a modal-like edit dialog
        const dialog = document.createElement('div');
        dialog.className = 'edit-dialog-overlay';
        dialog.innerHTML = `
            <div class="edit-dialog">
                <h4>Edit Schedule Settings</h4>
                <div class="edit-fields">
                    <div class="edit-field">
                        <label>Custom Start Date:</label>
                        <input type="date" id="start-date-input" placeholder="Leave empty to use original">
                    </div>
                    <div class="edit-field">
                        <label>Total Episodes:</label>
                        <input type="number" id="episodes-input" min="1" placeholder="Leave empty to use original">
                    </div>
                    <div class="edit-field">
                        <label>Skipped Weeks:</label>
                        <input type="number" id="skipped-weeks-input" min="0" placeholder="Number of weeks episodes were delayed">
                    </div>
                </div>
                <div class="edit-actions">
                    <button class="btn small" id="cancel-edit">Cancel</button>
                    <button class="btn small" id="save-edit">Save</button>
                </div>
            </div>
        `;

        setTimeout(async () => {
            // Load current updates from server
            let serverUpdates = { updates: {} };
            try {
                const res = await fetch('./data/schedule_updates.json?t=' + Date.now());
                if (res.ok) {
                    serverUpdates = await res.json();
                }
            } catch (e) {
                console.warn('Failed to load schedule updates from server:', e);
            }

            // Merge with local updates (local overrides server)
            const localUpdates = JSON.parse(localStorage.getItem('schedule_updates') || '{"updates":{}}');
            const updates = {
                updates: { ...serverUpdates.updates, ...localUpdates.updates }
            };

            const currentUpdate = updates.updates[show.id] || {};

            const startDateInput = dialog.querySelector('#start-date-input');
            const episodesInput = dialog.querySelector('#episodes-input');
            const skippedWeeksInput = dialog.querySelector('#skipped-weeks-input');

            // Set current values

            if (currentUpdate.custom_start_date) {
                // Convert from MM-DD-YY to YYYY-MM-DD for date input
                const [month, day, year] = currentUpdate.custom_start_date.split('-').map(Number);
                startDateInput.value = `20${year.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            } else if (show.custom_start_date) {
                const [month, day, year] = show.custom_start_date.split('-').map(Number);
                startDateInput.value = `20${year.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            } else if (show.start_date) {
                // Default to the show's original start date for easy editing
                const [month, day, year] = show.start_date.split('-').map(Number);
                startDateInput.value = `20${year.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            }

            if (currentUpdate.custom_episodes !== undefined) {
                episodesInput.value = currentUpdate.custom_episodes;
            } else if (show.custom_episodes !== undefined) {
                episodesInput.value = show.custom_episodes;
            }

            if (currentUpdate.skipped_weeks !== undefined) {
                skippedWeeksInput.value = currentUpdate.skipped_weeks;
            } else if (show.skipped_weeks !== undefined) {
                skippedWeeksInput.value = show.skipped_weeks;
            }

            // Event listeners
            dialog.querySelector('#cancel-edit').onclick = () => {
                document.body.removeChild(dialog);
            };

            dialog.querySelector('#save-edit').onclick = () => {
                const newUpdate = { ...currentUpdate };

                const startDateValue = startDateInput.value;
                if (startDateValue) {
                    // Convert from YYYY-MM-DD to MM-DD-YY
                    const [year, month, day] = startDateValue.split('-').map(Number);
                    newUpdate.custom_start_date = `${month}-${day}-${year - 2000}`;
                } else {
                    delete newUpdate.custom_start_date;
                }

                const episodesValue = episodesInput.value;
                if (episodesValue) {
                    newUpdate.custom_episodes = parseInt(episodesValue);
                } else {
                    delete newUpdate.custom_episodes;
                }

                const skippedWeeksValue = skippedWeeksInput.value;
                if (skippedWeeksValue && parseInt(skippedWeeksValue) > 0) {
                    newUpdate.skipped_weeks = parseInt(skippedWeeksValue);
                } else {
                    delete newUpdate.skipped_weeks;
                }

                // Save to schedule_updates
                if (Object.keys(newUpdate).length > 0) {
                    updates.updates[show.id] = newUpdate;
                } else {
                    delete updates.updates[show.id];
                }

                localStorage.setItem('schedule_updates', JSON.stringify(updates));

                // Save to server
                fetch('/save-schedule-updates', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updates)
                }).catch(err => console.warn('Failed to save schedule updates:', err));

                document.body.removeChild(dialog);
                onUpdate();
            };
        }, 0);

        document.body.appendChild(dialog);
    };
}

// Schedule view handler
export async function renderScheduleView(shows, container, titles = {}) {
    container.innerHTML = '';
    const today = new Date(); // Use actual current date
    let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2); // Week start for display (2 days before today)
    let selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Date for which to show content (today)

    // Get current view
    let currentView = localStorage.getItem('scheduleView') || 'grid';

    // Apply schedule updates to shows
    const updatedShows = await applyScheduleUpdates(shows);

    // Create view toggle
    const viewToggle = createViewToggle(currentView, async (newView) => {
        localStorage.setItem('scheduleView', newView);
        currentView = newView;
        await renderScheduleContent(updatedShows, scheduleContent, selectedDate, currentView, titles);
    });

    // Create schedule controls
    let controls = createScheduleControls(currentDate, selectedDate);
    const scheduleContent = document.createElement('div');
    scheduleContent.className = 'schedule-content';

    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'schedule-controls-container';
    controlsContainer.appendChild(viewToggle);
    controlsContainer.appendChild(controls);

    container.appendChild(controlsContainer);
    container.appendChild(scheduleContent);

    // Function to update controls and content
    const updateView = async (newWeekStart, newSelectedDate) => {
        currentDate = new Date(newWeekStart);
        selectedDate = new Date(newSelectedDate);
        const newControls = createScheduleControls(currentDate, selectedDate);
        controlsContainer.replaceChild(newControls, controls);
        controls = newControls;
        setupScheduleEventListeners(controls, currentDate, async (action, date) => {
            if (action === 'day-select' || action === 'date-pick') {
                // For specific date selection, adjust week start to show 2 days past
                const adjustedStart = new Date(date);
                adjustedStart.setDate(date.getDate() - 2);
                await updateView(adjustedStart, date);
            } else if (action === 'prev-week') {
                const newStart = new Date(currentDate);
                newStart.setDate(currentDate.getDate() - 7);
                // Keep selected date in the same relative position if possible
                const newSelected = new Date(selectedDate);
                newSelected.setDate(selectedDate.getDate() - 7);
                await updateView(newStart, newSelected);
            } else if (action === 'next-week') {
                const newStart = new Date(currentDate);
                newStart.setDate(currentDate.getDate() + 7);
                // Keep selected date in the same relative position if possible
                const newSelected = new Date(selectedDate);
                newSelected.setDate(selectedDate.getDate() + 7);
                await updateView(newStart, newSelected);
            }
        });
        await renderScheduleContent(updatedShows, scheduleContent, selectedDate, currentView, titles);
    };

    // Setup schedule controls event listeners
    setupScheduleEventListeners(controls, currentDate, async (action, date) => {
        if (action === 'day-select' || action === 'date-pick') {
            // For specific date selection, adjust week start to show 2 days past
            const adjustedStart = new Date(date);
            adjustedStart.setDate(date.getDate() - 2);
            await updateView(adjustedStart, date);
        } else if (action === 'prev-week') {
            const newStart = new Date(currentDate);
            newStart.setDate(currentDate.getDate() - 7);
            // Keep selected date in the same relative position if possible
            const newSelected = new Date(selectedDate);
            newSelected.setDate(selectedDate.getDate() - 7);
            await updateView(newStart, newSelected);
        } else if (action === 'next-week') {
            const newStart = new Date(currentDate);
            newStart.setDate(currentDate.getDate() + 7);
            // Keep selected date in the same relative position if possible
            const newSelected = new Date(selectedDate);
            newSelected.setDate(selectedDate.getDate() + 7);
            await updateView(newStart, newSelected);
        }
    });

    // Initial render
    await renderScheduleContent(updatedShows, scheduleContent, selectedDate, currentView, titles);
}