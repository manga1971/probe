// app.js
import { generateUUID, debounce, playIconSVG, pauseIconSVG, startChronometer, stopChronometer, resetChronometer, setupAccordion, showPage, updateNavState } from './common.js';

// DOM Elements
const appHeader = document.getElementById('appHeader');
const appTitle = document.getElementById('appTitle');
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
const transcriptionContent = document.getElementById('transcriptionContent');
const detailsAccordionHeader = document.getElementById('detailsAccordionHeader');
const detailsAccordionContent = detailsAccordionHeader.nextElementSibling;
const accordionIcon = detailsAccordionHeader.querySelector('.accordion-icon');
const saveCharacteristicsButton = document.getElementById('saveCharacteristicsButton');
const dictationToggleButton = document.getElementById('dictationToggleButton');
const pulsatingLed = document.getElementById('pulsatingLed');
const chronometer = document.getElementById('chronometer');
const copyAndSaveButton = document.getElementById('copyAndSaveButton');
const deleteFormButton = document.getElementById('deleteFormButton');

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

    if (pageId === 'forma-page') {
        headerSearchInput.style.display = 'flex';
        appHeader.classList.add('app-header-compact');
        dictateButtonHome.style.display = 'flex';
        loadInitialData();
        renderFormsList();
    } else if (pageId === 'edit-page') {
        headerSearchInput.style.display = 'none';
        appHeader.classList.remove('app-header-compact');
        dictateButtonHome.style.display = 'none';
        setupAccordion('detailsAccordionHeader');
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
            loadTranscriptionContent(formId);
        }
    } else {
        // Reset for new form
        currentFormId = null;
        formIdentifier.style.display = 'none';
        transcriptionContent.textContent = 'Press "Start" to begin dictation...';
        formTitle.value = '';
        formClient.value = '';
        formCategory.value = '';
        formStatus.value = 'not-started';
        plannedDate.value = '';
        initialNotes.value = '';
        updatePlayerUI('stopped');
    }
}

async function loadTranscriptionContent(formId) {
    const formRecordings = (await idbKeyval.get(`formRecordings-${formId}`)) || [];
    currentFormRecordings = formRecordings.map(s => s.text).join(' ');
    transcriptionContent.innerHTML = formatTranscriptionWithNotes(formRecordings);
}

function formatTranscriptionWithNotes(recordings) {
    let html = '';
    recordings.forEach((record, index) => {
        html += `<div class="note-item" data-note-id="${record.id}">
                    <div class="note-header">
                        <span class="note-label">Note ${recordings.length - index}</span>
                        <button class="favorite-toggle ${record.isImportant ? 'active' : ''}">
                            <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27l-4.11 2.27 1.1-4.68-3.57-3.1 4.71-.41L12 3.23l1.87 4.35 4.71.41-3.57 3.1 1.1 4.68z"/></svg>
                        </button>
                    </div>
                    <div class="note-text">${record.text}</div>
                 </div>`;
    });
    return html;
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

function startDictation() {
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
        transcriptionContent.innerHTML = dictatedText + finalTranscript + interimTranscript;
        transcriptionContent.scrollTop = transcriptionContent.scrollHeight;
    };
    
    recognition.onend = () => {
        isDictating = false;
        updatePlayerUI('stopped');
        stopChronometer();
        if (transcriptionContent.textContent.trim().length > 0) {
            saveDictatedSegment(transcriptionContent.textContent);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopDictation();
    };

    dictatedText = transcriptionContent.textContent.trim();
    if (dictatedText === 'Press "Start" to begin dictation...') {
        dictatedText = '';
    }
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
        dictatedText = transcriptionContent.textContent.trim();
        recognition.stop();
    }
}

async function saveDictatedSegment(text) {
    if (!currentFormId) {
        await createNewFormMetadata();
    }
    
    const formRecordings = (await idbKeyval.get(`formRecordings-${currentFormId}`)) || [];
    
    const segmentMetaData = {
        id: generateUUID(),
        formId: currentFormId,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        isImportant: false, // Default to not important
    };
    
    formRecordings.unshift(segmentMetaData);
    await idbKeyval.set(`formRecordings-${currentFormId}`, formRecordings);
    await loadTranscriptionContent(currentFormId);
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
        isFavorite: false, // Default to not favorite
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

        // Save transcription changes
        const formRecordings = (await idbKeyval.get(`formRecordings-${currentFormId}`)) || [];
        if (formRecordings.length > 0) {
            formRecordings[0].text = transcriptionContent.textContent;
            await idbKeyval.set(`formRecordings-${currentFormId}`, formRecordings);
        }
    }
}

async function toggleFavorite(formId) {
    const formIndex = allFormsMetadata.findIndex(f => f.id === formId);
    if (formIndex !== -1) {
        allFormsMetadata[formIndex].isFavorite = !allFormsMetadata[formIndex].isFavorite;
        await idbKeyval.set('formsMetadata', allFormsMetadata);
        renderFormsList();
    }
}

async function toggleImportantNote(noteId) {
    const formRecordings = (await idbKeyval.get(`formRecordings-${currentFormId}`)) || [];
    const noteIndex = formRecordings.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
        formRecordings[noteIndex].isImportant = !formRecordings[noteIndex].isImportant;
        await idbKeyval.set(`formRecordings-${currentFormId}`, formRecordings);
        loadTranscriptionContent(currentFormId);
    }
}

function resetNewFormState() {
    currentFormId = null;
    isDictating = false;
    dictatedText = '';
    stopDictation(); // Ensure recognition is stopped
}

// --- Rendering Home Page ---
async function renderFormsList(searchQuery = '', status = 'all', date = '', category = 'all') {
    let filteredForms = allFormsMetadata;
    // (Logic for filtering remains the same)
    formsListContainer.innerHTML = '';
    // ... rendering logic for form cards
}

// --- Event Listeners ---
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

copyAndSaveButton.addEventListener('click', async () => {
    await saveFormChanges();
    if (transcriptionContent.textContent.trim().length > 0) {
        navigator.clipboard.writeText(transcriptionContent.textContent).then(() => {
            alert('Text copied and saved!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        });
    }
});

deleteFormButton.addEventListener('click', async () => {
    if (!currentFormId) return;
    if (confirm('Are you sure you want to delete this form?')) {
        allFormsMetadata = allFormsMetadata.filter(f => f.id !== currentFormId);
        await idbKeyval.set('formsMetadata', allFormsMetadata);
        await idbKeyval.del(`formRecordings-${currentFormId}`);
        navigateTo('forma-page');
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    allFormsMetadata = (await idbKeyval.get('formsMetadata')) || [];
    renderFormsList();
    setupAccordion('detailsAccordionHeader');
    dictateButtonHome.style.display = 'flex';
});

window.navigateTo = navigateTo;
window.toggleFavorite = toggleFavorite;
