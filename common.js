// common.js — tiny helpers shared across app modules

// DOM helpers
export const $ = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

// Utilities
export const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

export const debounce = (fn, wait=180) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

export const formatTime = (sec) => {
  const s = Math.max(0, sec|0);
  const m = Math.floor(s/60);
  const r = s % 60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
};

// Toast
export const toast = (msg='Saved') => {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); }, 1400);
};

// Pages
export const showPage = (id) => {
  $$('.page').forEach(p => p.classList.remove('active'));
  $('#' + id).classList.add('active');
  window.scrollTo({top:0, behavior:'instant'});
};

// Storage (idb-keyval UMD)
const store = window.idbKeyval;

export const storage = {
  async get(key){ return await store.get(key) },
  async set(key, val){ return await store.set(key, val) },
  async del(key){ return await store.del(key) },
  async keys(){ return await store.keys() }
};

// Chronometer
export const Chrono = () => {
  let start = 0, acc = 0, running = false, rafId = 0, cb = () => {};
  const tick = () => {
    if(!running) return;
    cb((Date.now() - start + acc)/1000);
    rafId = requestAnimationFrame(tick);
  };
  return {
    on(fn){ cb = fn || (()=>{}); },
    start(){ if(running) return; running = true; start = Date.now(); tick(); },
    pause(){ if(!running) return; running = false; acc += Date.now() - start; cancelAnimationFrame(rafId); },
    reset(){ running = false; acc = 0; cancelAnimationFrame(rafId); cb(0); }
  };
};
