// common.js — improved utilities & UI helpers

// --- Icons ---
export const playIconSVG = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
export const pauseIconSVG = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

// --- UUID ---
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// --- Debounce ---
export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), delay);
  };
}

// --- Page navigation (SPA) ---
export function showPage(pageId) {
  const sections = document.querySelectorAll('.page-section');
  sections.forEach(sec => {
    sec.classList.remove('active');
    sec.style.display = 'none';
  });
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    // Most layouts use flex containers for sections in this app
    target.style.display = 'flex';
  }
}

// --- Navbar active state ---
export function updateNavState(navId) {
  document.querySelectorAll('.navbar-button').forEach(btn => btn.classList.remove('active'));
  const el = document.getElementById(navId);
  if (el) el.classList.add('active');
}

// --- Accordion helper ---
export function setupAccordion() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    // Prevent duplicate binding
    if (header.dataset.bound === '1') return;
    header.dataset.bound = '1';
    header.addEventListener('click', () => {
      const content = header.parentElement?.querySelector('.accordion-content');
      if (!content) return;
      const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';
      if (isOpen) {
        content.style.maxHeight = '0px';
        content.setAttribute('aria-hidden', 'true');
        header.setAttribute('aria-expanded', 'false');
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.setAttribute('aria-hidden', 'false');
        header.setAttribute('aria-expanded', 'true');
      }
      const icon = header.querySelector('.accordion-icon');
      if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  });
}

// --- Chronometer helpers ---
let chronometerInterval = null;
let elapsedTimeMs = 0;

function formatMMSS(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Start (or resume) a chronometer on a span by id.
 * @param {string} elementId - DOM id for the <span> where time is shown
 */
export function startChronometer(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const startAt = Date.now() - elapsedTimeMs;
  clearInterval(chronometerInterval);
  chronometerInterval = setInterval(() => {
    elapsedTimeMs = Date.now() - startAt;
    el.textContent = formatMMSS(elapsedTimeMs);
  }, 250);
}

/**
 * Reset a chronometer and stop it.
 * @param {string} elementId - DOM id for the <span>
 */
export function resetChronometer(elementId) {
  clearInterval(chronometerInterval);
  chronometerInterval = null;
  elapsedTimeMs = 0;
  const el = document.getElementById(elementId);
  if (el) el.textContent = '00:00';
}

/**
 * Pause the chronometer without resetting elapsed time.
 */
export function pauseChronometer() {
  clearInterval(chronometerInterval);
  chronometerInterval = null;
}

// --- Tiny toast helper (non-blocking feedback) ---
export function showToast(message, timeout = 1800) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.style.position = 'fixed';
  toast.style.right = '16px';
  toast.style.bottom = '16px';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '12px';
  toast.style.boxShadow = '0 6px 24px rgba(0,0,0,0.15)';
  toast.style.background = 'rgba(32,32,32,0.92)';
  toast.style.color = '#fff';
  toast.style.fontSize = '14px';
  toast.style.zIndex = 9999;
  toast.style.opacity = '0';
  toast.style.transition = 'opacity .2s ease';
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, timeout);
}
