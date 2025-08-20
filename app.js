// app.js — Forma (refactor minimal, value-first)
import { $, $$, debounce, generateUUID, formatTime, toast, showPage, storage, Chrono } from './common.js';

// --- State ---
let forms = [];                    // metadata array
let currentFormId = null;          // active form id
let isRecording = false;           // recording flag
let hadError = false;
let recognition = null;            // webkitSpeechRecognition instance
const chrono = Chrono();
let currentText = '';              // in-progress note text

// --- Elements ---
// Header
const brandHome = $('#brandHome');
const headerSearchInput = $('#headerSearchInput');
const accountBtn = $('#accountBtn');

// Home
const homePage = $('#homePage');
const formsList = $('#formsList');
const noForms = $('#noForms');
const filterStatus = $('#filterStatus');
const filterDate = $('#filterDate');
const filterCategory = $('#filterCategory');
const newFormBtn = $('#newFormBtn');
const dictateButtonHome = $('#dictateButtonHome');

// Edit
const editPage = $('#editPage');
const formIdLabel = $('#formIdLabel');
const deleteFormBtn = $('#deleteFormBtn');
const formTitle = $('#formTitle');
const formCategory = $('#formCategory');
const formStatus = $('#formStatus');
const speechLang = $('#speechLang');
const newNote = $('#newNote');
const existingNotes = $('#existingNotes');

// Player
const playerBar = $('#playerBar');
const pauseBtn = $('#pauseBtn');
const recIndicator = $('#recIndicator');
const playerTime = $('#playerTime');
const copyBtn = $('#copyBtn');
const saveBtn = $('#saveBtn');
const deleteBtn = $('#deleteBtn');

// --- Init ---
document.addEventListener('DOMContentLoaded', init);
async function init(){
  // Load persisted metadata
  forms = await (storage.get('formsMetadata') || Promise.resolve([])) || [];
  renderHome();
  wireHeader();
  wireHomeFilters();
  wirePlayer();
  chrono.on(sec => playerTime.textContent = formatTime(sec));
}

// --- Header wiring ---
function wireHeader(){
  brandHome.addEventListener('click', (e)=>{ e.preventDefault(); navigateHome(); });
  headerSearchInput.addEventListener('input', debounce(()=> renderHome(), 160));
  accountBtn.addEventListener('click', ()=> toast('Account soon'));
}

// --- Home wiring ---
function wireHomeFilters(){
  [filterStatus, filterDate, filterCategory].forEach(el => el.addEventListener('change', renderHome));
  newFormBtn.addEventListener('click', () => {
    const id = createForm();
    openForm(id, {autoStart:false});
  });
  dictateButtonHome.addEventListener('click', () => {
    const id = createForm();
    openForm(id, {autoStart:true});
  });
}

// --- Player wiring ---
function wirePlayer(){
  pauseBtn.addEventListener('click', () => {
    if(!recognition){ return; }
    if(isRecording){ pauseRecording(); } else { resumeRecording(); }
  });
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(newNote.value || ''); toast('Copied'); } catch(e){ console.warn(e); }
  });
  saveBtn.addEventListener('click', saveCurrentNote);
  deleteBtn.addEventListener('click', () => { newNote.value = ''; currentText=''; toast('Cleared'); });
}

// --- Navigation ---
function navigateHome(){
  showPage('homePage');
  playerBar.style.display = 'none';
  currentFormId = null;
  headerSearchInput.value = headerSearchInput.value; // keep search text
  renderHome();
}
function openForm(id, {autoStart=false}={}){
  currentFormId = id;
  formIdLabel.textContent = `Form # ${id.slice(0,5).toUpperCase()}`;
  const meta = forms.find(f => f.id === id);
  formTitle.value = meta?.title || '';
  formCategory.value = meta?.category || '';
  formStatus.value = meta?.status || 'not-started';
  speechLang.value = (localStorage.getItem('speechLang') || 'ro-RO');
  newNote.value = '';
  existingNotes.replaceChildren();
  renderNotes();
  playerBar.style.display = 'flex';
  showPage('editPage');
  if(autoStart) startRecording();
}

// --- Render Home ---
function renderHome(){
  // populate categories
  const cats = new Set(forms.map(f=>f.category).filter(Boolean));
  filterCategory.replaceChildren(new Option('All categories','all'));
  [...cats].sort().forEach(c => filterCategory.append(new Option(c, c)));

  const q = (headerSearchInput.value || '').trim().toLowerCase();
  const st = filterStatus.value;
  const dt = filterDate.value;
  const cat = filterCategory.value;

  const filtered = forms.filter(f => {
    const okQ = !q || (f.title?.toLowerCase().includes(q) || (f.category||'').toLowerCase().includes(q));
    const okS = st==='all' || f.status===st;
    const okC = cat==='all' || f.category===cat;
    const okD = !dt || (new Date(f.updatedAt).toISOString().slice(0,10) === dt);
    return okQ && okS && okC && okD;
  }).sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));

  formsList.replaceChildren();
  if(!filtered.length){
    noForms.classList.remove('hidden');
  }else{
    noForms.classList.add('hidden');
    filtered.forEach(meta => formsList.append(renderFormCard(meta)));
  }
}

function renderFormCard(meta){
  const card = document.createElement('article');
  card.className = 'card';

  const titleRow = document.createElement('div');
  titleRow.className = 'row';
  const h = document.createElement('h3');
  h.textContent = meta.title || 'Untitled';
  titleRow.append(h);
  const pill = document.createElement('span');
  pill.className = 'pill';
  pill.textContent = meta.status.replace('-',' ').toUpperCase();
  titleRow.append(pill);
  card.append(titleRow);

  const metaRow = document.createElement('div');
  metaRow.className = 'meta';
  metaRow.textContent = `${meta.category||'–'} • ${new Date(meta.updatedAt).toLocaleString()}`;
  card.append(metaRow);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn tiny';
  editBtn.title = 'Edit';
  editBtn.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
  editBtn.addEventListener('click', ()=> openForm(meta.id, {autoStart:false}));
  const dictateBtn = document.createElement('button');
  dictateBtn.className = 'icon-btn tiny';
  dictateBtn.title = 'Dictate';
  dictateBtn.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0zM12 19a7 7 0 0 0 7-7h-2a5 5 0 1 1-10 0H5a7 7 0 0 0 7 7z"/></svg>';
  dictateBtn.addEventListener('click', ()=> openForm(meta.id, {autoStart:true}));
  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn tiny danger';
  delBtn.title = 'Delete';
  delBtn.innerHTML = '<svg viewBox="0 0 24 24" class="icon"><path d="M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-3h6l1 1h4v2H4V5h4l1-1z"/></svg>';
  delBtn.addEventListener('click', async ()=>{ await deleteForm(meta.id); });

  actions.append(editBtn, dictateBtn, delBtn);
  card.append(actions);
  return card;
}

// --- Forms CRUD ---
function createForm(){
  const id = generateUUID();
  const meta = { id, title:'', category:'', status:'not-started', createdAt: Date.now(), updatedAt: Date.now(), noteCount:0 };
  forms.unshift(meta);
  persistForms();
  return id;
}

async function deleteForm(id=currentFormId){
  if(!id) return;
  if(!confirm('Delete this form and all its notes?')) return;
  forms = forms.filter(f=>f.id!==id);
  await storage.del(`formNotes:${id}`);
  persistForms();
  toast('Deleted');
  navigateHome();
}

function persistForms(){ storage.set('formsMetadata', forms); renderHome(); }

deleteFormBtn.addEventListener('click', ()=> deleteForm(currentFormId));

// --- Notes ---
async function getNotes(){
  return await (storage.get(`formNotes:${currentFormId}`) || Promise.resolve([])) || [];
}
async function setNotes(list){
  await storage.set(`formNotes:${currentFormId}`, list);
}

async function renderNotes(){
  const list = await getNotes();
  // important first, then newest
  list.sort((a,b)=> (b.isImportant|0)-(a.isImportant|0) || b.createdAt - a.createdAt);
  existingNotes.replaceChildren(...list.map(renderNote));
}

function renderNote(n){
  const wrap = document.createElement('div');
  wrap.className = 'note';
  const num = document.createElement('div'); num.className = 'num'; num.textContent = `#${n.number}`;
  const text = document.createElement('div'); text.className = 'text'; text.textContent = n.text;
  const actions = document.createElement('div'); actions.className = 'note-actions';

  const fav = btnIcon(n.isImportant ? '★' : '☆', 'Mark important');
  fav.addEventListener('click', async ()=>{
    const list = await getNotes();
    const it = list.find(x=>x.id===n.id); if(!it) return;
    it.isImportant = !it.isImportant; await setNotes(list); renderNotes();
  });

  const copy = btnSVG('<path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>','Copy');
  copy.addEventListener('click', async ()=>{ await navigator.clipboard.writeText(n.text); toast('Copied'); });

  const del = btnSVG('<path d="M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm3-3h6l1 1h4v2H4V5h4l1-1z"/>','Delete');
  del.classList.add('danger');
  del.addEventListener('click', async ()=>{
    const list = await getNotes();
    const next = list.filter(x=>x.id!==n.id);
    await setNotes(next); toast('Deleted note'); renderNotes();
    const meta = forms.find(f=>f.id===currentFormId);
    meta.noteCount = next.length; meta.updatedAt = Date.now(); persistForms();
  });

  actions.append(fav, copy, del);
  wrap.append(num, text, actions);
  return wrap;
}

function btnIcon(txt, title){ const b=document.createElement('button'); b.className='icon-btn'; b.title=title; b.textContent=txt; return b; }
function btnSVG(path, title){ const b=document.createElement('button'); b.className='icon-btn'; b.title=title; b.innerHTML = `<svg viewBox="0 0 24 24" class="icon">${path}</svg>`; return b; }

// Save current text as note
async function saveCurrentNote(){
  const text = (newNote.value || '').trim();
  if(!text){ toast('Nothing to save'); return; }
  const list = await getNotes();
  const nextNum = list.length ? Math.max(...list.map(n=>n.number))+1 : 1;
  const note = { id: generateUUID(), number: nextNum, text, createdAt: Date.now(), isImportant:false };
  list.push(note);
  await setNotes(list);
  newNote.value='';
  toast('Saved');
  renderNotes();
  // auto-title if empty
  if(!formTitle.value){
    formTitle.value = text.split(/\s+/).slice(0,8).join(' ');
    saveFormMeta();
  }
  const meta = forms.find(f=>f.id===currentFormId);
  meta.noteCount = list.length; meta.updatedAt = Date.now(); persistForms();
}

// --- Form meta save ---
function saveFormMeta(){
  const meta = forms.find(f=>f.id===currentFormId);
  if(!meta) return;
  meta.title = formTitle.value.trim();
  meta.category = formCategory.value.trim();
  meta.status = formStatus.value;
  meta.updatedAt = Date.now();
  localStorage.setItem('speechLang', speechLang.value);
  persistForms();
}
[formTitle, formCategory, formStatus, speechLang].forEach(el => el.addEventListener('change', saveFormMeta));

// --- Recording ---
function setupRecognition(){
  if(!('webkitSpeechRecognition' in window)){
    alert('Dictation not supported on this browser. You can type your note.');
    return null;
  }
  const rec = new webkitSpeechRecognition(); // eslint-disable-line
  rec.lang = (localStorage.getItem('speechLang') || speechLang.value || 'ro-RO');
  rec.interimResults = true;
  rec.continuous = true;
  rec.onstart = () => { isRecording = true; hadError=false; recIndicator.classList.remove('idle'); chrono.start(); };
  rec.onerror = (e) => { console.warn('rec error', e); hadError = true; };
  rec.onend = async () => {
    isRecording = false; recIndicator.classList.add('idle'); chrono.pause();
    // do not auto-save if we had an error/abort
    if(!hadError){
      currentText = newNote.value.trim();
      if(currentText) toast('Recording stopped');
    }
  };
  rec.onresult = (ev) => {
    let text = '';
    for(let i = ev.resultIndex; i < ev.results.length; i++){
      const res = ev.results[i];
      text += res[0].transcript;
    }
    newNote.value = text;
  };
  return rec;
}

function startRecording(){
  if(isRecording) return;
  recognition = setupRecognition();
  if(!recognition){ return; }
  try{ recognition.start(); }catch(e){ console.warn(e); }
}
function pauseRecording(){
  if(!isRecording) return;
  try{ recognition.stop(); }catch(e){}
}
function resumeRecording(){
  if(isRecording) return;
  hadError=false;
  recognition = setupRecognition();
  if(!recognition){ return; }
  try{ recognition.start(); }catch(e){}
}

// --- Events for typing ---
newNote.addEventListener('keydown', (e)=>{
  if((e.metaKey||e.ctrlKey) && e.key==='Enter'){ e.preventDefault(); saveCurrentNote(); }
});

// --- Expose minimal globals (optional) ---
window.openForm = openForm;
