// app.js
import { generateUUID, debounce, playIconSVG, pauseIconSVG, startChronometer, stopChronometer, resetChronometer, setupAccordion, showPage } from './common.js';

// DOM Elements
const appHeader = document.getElementById('appHeader');
const appTitle = document.getElementById('appTitle');
const homeNavButton = document.getElementById('homeNavButton');
const headerSearchInput = document.getElementById('headerSearchInput');
const accountSettingsButton = document.getElementById('accountSettingsButton');
const dictateButtonHome = document.getElementById('dictateButtonHome');

// Home Page Elements
const formaPage = document.getElementById('forma-page');
const formsListContainer = document.getElementById('formsList');
const noFormsMessage = document.getElementById('noFormsMessage');
const filterStatus = document.getElementById('filterStatus');
const filterDate = document.getElementById('filterDate');
const filterCategory = document.getElementById('filterCategory');

// Edit Page Elements
const editPage = document.getElementById('edit-page');
const formIdentifier = document.getElementById('formIdentifier');
const formTitle = document.getElementById('formTitle');
const formClient = document.getElementById('formClient');
const formCategory = document.getElementById('formCategory');
const formStatus = document.getElementById('formStatus');
const plannedDate = document.getElementById('plannedDate');
const initialNotes = document.getElementById('initialNotes');
const newNoteContent = document.getElementById('newNoteContent');
const existingNotesContainer = document.getElementById('existingNotesContainer');
const detailsAccordionHeader = document.getElementById('detailsAccordionHeader');
const detailsAccordionContent = detailsAccordionHeader.nextElementSibling;
const accordionIcon = detailsAccordionHeader.querySelector('.accordion-icon');
const saveCharacteristicsButton = document.getElementById('saveCharacteristicsButton');
const playerControls = document.getElementById('playerControls');
const dictationToggleButton = document.getElementById('dictationToggleButton');
const pulsatingLed = document.getElementById('pulsatingLed');
const chronometer = document.getElementById('chronometer');
const copyButton = document.getElementById('copyButton');
const saveButton = document.getElementById('saveButton');
const deleteButton = document.getElementById('deleteButton');
const playButton = document.getElementById('playButton'); // Added play button

// Global state variables
let allFormsMetadata = [];
let currentFormId = null;
let isDictating = false;
let recognition;
let dictatedText = '';
let currentFormRecordings = '';

// --- Navigation and Page Management ---
function navigateTo(pageId, formId = null) {
    showPage(pageId);
    appTitle.textContent = 'Forma';
    playerControls.style.display = 'none';
    dictateButtonHome.style.display = 'none';
    headerSearchInput.style.display = 'none';

    if (pageId === 'forma-page') {
        dictateButtonHome.style.display = 'flex';
        headerSearchInput.style.display = 'flex';
        appHeader.style.padding = '1rem';
        appHeader.style.borderRadius = '1rem';
        loadInitialData();
    } else if (pageId === 'edit-page') {
        playerControls.style.display = 'flex';
        appHeader.style.padding = '1rem 1rem 0';
        appHeader.style.borderRadius = '1rem 1rem 0 0';
        initializeEditPage(formId);
    }
}

function initializeEditPage(formId) {
    if (formId) {
        // Load existing form
        const formToEdit = allFormsMetadata.find(f => f.id === formId);
        if (formToEdit) {
            currentFormId = formToEdit.id;
            formTitle.value = formToEdit.title || '';
            formClient.value = formToEdit.client || '';
            formCategory.value = formToEdit.category || '';
            formStatus.value = formToEdit.status || 'not-started';
            plannedDate.value = formToEdit.plannedDate || '';
            initialNotes.value = formToEdit.notes || '';
            formIdentifier.textContent = `Form #${formToEdit.formNumber}`;
            formIdentifier.style.display = 'block';
            loadNotes(formId);
        }
    } else {
        // Reset for new form
        currentFormId = null;
        formIdentifier.textContent = 'Form #';
        formIdentifier.style.display = 'none';
        newNoteContent.textContent = 'Press "Start" to begin dictation...';
        existingNotesContainer.innerHTML = '';
        formTitle.value = '';
        formClient.value = '';
        formCategory.value = '';
        formStatus.value = 'not-started';
        plannedDate.value = '';
        initialNotes.value = '';
        updatePlayerUI('stopped');
    }
    setupAccordion('detailsAccordionHeader');
}

async function loadNotes(formId) {
    const formRecordings = (await idbKeyval.get(`formRecordings-${formId}`)) || [];
    existingNotesContainer.innerHTML = '';
    formRecordings.forEach((record, index) => {
        const noteElement = document.createElement('div');
        noteElement.className = `glass-container note-item`;
        noteElement.innerHTML = `
            <div class="note-header">
                <span class="note-label">Note ${formRecordings.length - index}</span>
                <button class="favorite-toggle ${record.isImportant ? 'active' : ''}" data-note-id="${record.id}">
                    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27l-4.11 2.27 1.1-4.68-3.57-3.1 4.71-.41L12 3.23l1.87 4.35 4.71.41-3.57 3.1 1.1 4.68z"/></svg>
                </button>
            </div>
            <div class="note-text">${record.text}</div>
        `;
        existingNotesContainer.appendChild(noteElement);
    });
}

// --- Player Logic and Dictation ---
function updatePlayerUI(state) {
    if (state === 'recording') {
        pulsatingLed.classList.add('active');
        dictationToggleButton.innerHTML = pauseIconSVG;
    } else if (state === 'paused') {
        pulsatingLed.classList.remove('active');
        dictationToggleButton.innerHTML = playIconSVG;
    } else { // stopped
        pulsatingLed.classList.remove('active');
        dictationToggleButton.innerHTML = playIconSVG;
        resetChronometer('chronometer');
    }
}

async function startDictation() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Web Speech API is not supported in this browser. Please use Chrome or a similar browser.");
        return;
    }
    
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isDictating = true;
        updatePlayerUI('recording');
        startChronometer('chronometer');
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        newNoteContent.textContent = dictatedText + finalTranscript + interimTranscript;
    };
    
    recognition.onend = () => {
        isDictating = false;
        updatePlayerUI('stopped');
        stopChronometer();
        if (newNoteContent.textContent.trim().length > 0) {
            saveNewNote(newNoteContent.textContent);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopDictation();
    };

    if (newNoteContent.textContent.includes("Press \"Start\" to begin dictation...")) {
        newNoteContent.textContent = '';
    }
    dictatedText = newNoteContent.textContent.trim();
    recognition.start();
}

function stopDictation() {
    if (recognition) {
        recognition.stop();
    }
}

function pauseDictation() {
    if (isDictating) {
        isDictating = false;
        updatePlayerUI('paused');
        stopChronometer();
        dictatedText = newNoteContent.textContent.trim();
        recognition.stop();
    }
}

async function saveNewNote(text) {
    if (!currentFormId) {
        await createNewFormMetadata();
    }
    
    const formRecordings = (await idbKeyval.get(`formRecordings-${currentFormId}`)) || [];
    const segmentMetaData = {
        id: generateUUID(),
        formId: currentFormId,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        isImportant: false,
    };
    
    formRecordings.unshift(segmentMetaData);
    await idbKeyval.set(`formRecordings-${currentFormId}`, formRecordings);
    await loadNotes(currentFormId);
    newNoteContent.textContent = ''; // Clear new note box after saving
}

// --- Form & Data Management ---
async function createNewFormMetadata() {
    let lastFormSequenceNumber = (await idbKeyval.get('lastFormSequenceNumber')) || 0;
    const newFormNumber = ++lastFormSequenceNumber;
    await idbKeyval.set('lastFormSequenceNumber', newFormNumber);
    
    currentFormId = generateUUID();
    const now = new Date();
    
    const formData = {
        id: currentFormId,
        formNumber: newFormNumber,
        title: formTitle.value || `Form #${newFormNumber}`,
        client: formClient.value,
        category: formCategory.value,
        status: formStatus.value,
        notes: initialNotes.value,
        plannedDate: plannedDate.value,
        createdAt: now.toISOString(),
        lastModified: now.toISOString(),
        isFavorite: false,
    };
    
    allFormsMetadata.unshift(formData);
    await idbKeyval.set('formsMetadata', allFormsMetadata);
    
    formIdentifier.textContent = `Form #${newFormNumber}`;
    formIdentifier.style.display = 'block';
}

async function saveFormChanges() {
    if (!currentFormId) {
        return;
    }
    
    const formToUpdate = allFormsMetadata.find(f => f.id === currentFormId);
    if (formToUpdate) {
        formToUpdate.title = formTitle.value;
        formToUpdate.client = formClient.value;
        formToUpdate.category = formCategory.value;
        formToUpdate.status = formStatus.value;
        formToUpdate.notes = initialNotes.value;
        formToUpdate.plannedDate = plannedDate.value;
        formToUpdate.lastModified = new Date().toISOString();
        await idbKeyval.set('formsMetadata', allFormsMetadata);
    }
}

async function deleteForm() {
    if (!currentFormId) return;
    if (confirm('Are you sure you want to delete this form?')) {
        allFormsMetadata = allFormsMetadata.filter(f => f.id !== currentFormId);
        await idbKeyval.set('formsMetadata', allFormsMetadata);
        await idbKeyval.del(`formRecordings-${currentFormId}`);
        navigateTo('forma-page');
    }
}

// --- Rendering Home Page ---
async function renderFormsList(searchQuery = '', status = 'all', date = '', category = 'all') {
    let filteredForms = allFormsMetadata;
    // (Logic for filtering remains the same)
    formsListContainer.innerHTML = '';
    // ... rendering logic for form cards
}

async function loadInitialData() {
    allFormsMetadata = (await idbKeyval.get('formsMetadata')) || [];
    renderFormsList();
    // populateCategoryFilter(); // No longer needed for this simplified version
}

// --- Event Listeners ---
homeNavButton.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('forma-page');
});

dictateButtonHome.addEventListener('click', () => {
    navigateTo('edit-page');
});

dictationToggleButton.addEventListener('click', () => {
    if (isDictating) {
        pauseDictation();
    } else {
        startDictation();
    }
});

saveCharacteristicsButton.addEventListener('click', () => {
    saveFormChanges();
    if (detailsAccordionContent.classList.contains('expanded')) {
        detailsAccordionHeader.click();
    }
});

copyButton.addEventListener('click', () => {
    // Copy only the text of the new note to the clipboard
    if (newNoteContent.textContent.trim().length > 0) {
        navigator.clipboard.writeText(newNoteContent.textContent).then(() => {
            alert('Text copied!');
        });
    }
});

saveButton.addEventListener('click', async () => {
    if (newNoteContent.textContent.trim().length > 0) {
        await saveNewNote(newNoteContent.textContent);
    }
    await saveFormChanges();
    alert('Changes saved!');
});

deleteButton.addEventListener('click', async () => {
    await deleteForm();
});

document.addEventListener('DOMContentLoaded', async () => {
    navigateTo('forma-page');
});

// Expose functions to the global scope for onclick attributes in dynamically generated HTML
window.navigateTo = navigateTo;
window.toggleFavorite = toggleFavorite;
window.deleteFormFromHome = deleteForm;
