// common.js

// Constants for icons
export const playIconSVG = `<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>`;
export const pauseIconSVG = `<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

// Utility to generate a unique ID
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Utility to create a debounced function
export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Global state variables for chronometer
export let chronometerInterval = null;
export let elapsedTime = 0;

// Chronometer logic
export function startChronometer(elementId) {
    const chronometerElement = document.getElementById(elementId);
    if (chronometerInterval) {
        clearInterval(chronometerInterval);
    }
    const startTime = Date.now() - elapsedTime;
    chronometerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        let minutes = Math.floor(elapsedTime / 60000);
        let seconds = Math.floor((elapsedTime % 60000) / 1000);
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        chronometerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

export function stopChronometer() {
    clearInterval(chronometerInterval);
    chronometerInterval = null;
}

export function resetChronometer(elementId) {
    stopChronometer();
    elapsedTime = 0;
    document.getElementById(elementId).textContent = "00:00";
}

// Details accordion logic
export function setupAccordion(headerId) {
    const accordionHeader = document.getElementById(headerId);
    if (accordionHeader) {
        accordionHeader.addEventListener('click', () => {
            const accordionIcon = accordionHeader.querySelector('.accordion-icon');
            const accordionContent = accordionHeader.nextElementSibling;
            accordionContent.classList.toggle('expanded');
            accordionIcon.classList.toggle('expanded');
        });
    }
}

// Show/hide page logic
export function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Update navbar active state
export function updateNavState(navId) {
    document.querySelectorAll('.navbar-button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(navId).classList.add('active');
}