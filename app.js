// app.js
import { generateUUID, debounce, playIconSVG, pauseIconSVG, startChronometer, stopChronometer, resetChronometer, setupAccordion, showPage, updateNavState } from './common.js';

// DOM Elements - Navigation
const myFormsNav = document.getElementById('my-forms-nav');
const newFormNav = document.getElementById('new-form-nav');

// DOM Elements - My Forms Page
const myFormsPage = document.getElementById('my-forms-page');
const todayTasksList = document.getElementById('todayTasksList');
const noTodayTasksMessage = document.getElementById('noTodayTasksMessage');
const formsListContainer = document.getElementById('formsList');
const noFormsMessage = document.getElementById('noFormsMessage');
const searchFormsInput = document.getElementById('headerSearchInput');

// Filter Elements
const filterStatus = document.getElementById('filterStatus');
const filterDate = document.getElementById('filterDate');
const filterCategory = document.getElementById('filterCategory');

// General UI Elements
const appTitle = document.getElementById('appTitle');
const headerSearchInput = document.getElementById('headerSearchInput');

// Global state variables for forms data
let allFormsMetadata = [];

// --- SPA Navigation Logic ---
function navigateTo(pageId, title, showSearch = false, formId = null) {
    showPage(pageId);
    appTitle.textContent = title;
    headerSearchInput.style.display = showSearch ? 'flex' : 'none';

    if (pageId === 'my-forms-page') {
        updateNavState('my-forms-nav');
        resetNewFormState();
        loadInitialData();
        renderFormsList();
    } else if (pageId === 'new-form-page') {
        updateNavState('new-form-nav');
        resetNewFormState();
    } else if (pageId === 'form-report-page' && formId) {
        // We do not change nav state for the report page
        // But we hide search
        headerSearchInput.style.display = 'none';
        loadFormReportContent(formId);
    }
}

function initializeNewForm() {
    setupAccordion('detailsAccordionHeaderNew');
    updatePlayerUI('stopped');
}

function navigateToFormReport(formId) {
    const formToEdit = allFormsMetadata.find(f => f.id === formId);
    const title = formToEdit ? (formToEdit.title || `Form #${formToEdit.formNumber}`) : 'Form Report';
    navigateTo('form-report-page', title, false, formId);
}

// --- My Forms Page Logic ---
window.deleteForm = async (id) => {
    if (!confirm('Are you sure you want to delete this form? This cannot be undone.')) return;

    allFormsMetadata = allFormsMetadata.filter(f => f.id !== id);
    await idbKeyval.set('formsMetadata', allFormsMetadata);
    await idbKeyval.del(`formRecordings-${id}`); 
    
    alert('Form has been deleted successfully.');
    await loadInitialData();
    renderFormsList(); 
    renderTodayTasks(); 
};

async function renderFormsList(searchQuery = '', status = 'all', date = '', category = 'all') {
    let filteredForms = allFormsMetadata;

    if (searchQuery) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        filteredForms = filteredForms.filter(form => 
            (form.title && form.title.toLowerCase().includes(lowerCaseQuery)) ||
            (form.client && form.client.toLowerCase().includes(lowerCaseQuery)) ||
            (form.category && form.category.toLowerCase().includes(lowerCaseQuery)) ||
            (form.formNumber && String(form.formNumber).includes(lowerCaseQuery))
        );
    }
    
    if (status !== 'all') {
        filteredForms = filteredForms.filter(form => form.status === status);
    }
    
    if (date) {
        const filterDateFormatted = new Date(date).toISOString().split('T')[0];
        filteredForms = filteredForms.filter(form => {
            const formDateFormatted = new Date(form.createdAt).toISOString().split('T')[0];
            return formDateFormatted === filterDateFormatted;
        });
    }
    
    if (category !== 'all') {
        filteredForms = filteredForms.filter(form => form.category === category);
    }

    formsListContainer.innerHTML = ''; 

    if (filteredForms.length === 0) {
        noFormsMessage.style.display = 'block';
        return;
    } else {
        noFormsMessage.style.display = 'none';
    }

    filteredForms.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    for (const form of filteredForms) { 
        let statusColorClass = 'status-new'; 
        let statusText = 'New';
        if (form.status === 'in-progress') {
            statusColorClass = 'status-in-progress';
            statusText = 'In Progress';
        } else if (form.status === 'completed') {
            statusColorClass = 'status-completed';
            statusText = 'Completed';
        }
        
        const formRecordings = (await idbKeyval.get(`formRecordings-${form.id}`)) || [];
        const numNotes = formRecordings.length;
        
        const card = document.createElement('div');
        card.className = `card-item status-bar-indicator ${statusColorClass}`;
        card.innerHTML = `
            <div class="card-content">
                <div class="card-header-actions">
                    <h3 class="card-item-title">Form #${form.formNumber || 'N/A'} - ${form.title || 'Untitled Form'}</h3>
                    <div class="card-actions">
                        <button onclick="navigateToFormReport('${form.id}')" class="icon-button" aria-label="View/Edit">
                            <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button onclick="deleteForm('${form.id}')" class="icon-button" aria-label="Delete">
                            <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                </div>
                <p class="card-item-meta">
                    ${new Date(form.createdAt).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'})} • 
                    ${form.client || 'No Client'} • 
                    ${form.category || 'General'}
                </p>
                <div class="card-footer">
                    <span class="card-status-pill ${form.status}">${statusText}</span>
                    <span class="card-stats">${numNotes} Note(s)</span>
                </div>
            </div>
        `;
        formsListContainer.appendChild(card);
    }
}

async function renderTodayTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const tasksForToday = allFormsMetadata.filter(form => {
        if (!form.plannedDate) return false;
        const formPlannedDate = new Date(form.plannedDate);
        formPlannedDate.setHours(0, 0, 0, 0);
        return formPlannedDate.getTime() === today.getTime() && form.status !== 'completed';
    });

    todayTasksList.innerHTML = '';
    if (tasksForToday.length === 0) {
        noTodayTasksMessage.style.display = 'block';
    } else {
        noTodayTasksMessage.style.display = 'none';
        tasksForToday.forEach(form => {
            const taskElement = document.createElement('div');
            taskElement.className = `card-item task-item glass-container`;
            taskElement.onclick = () => { navigateToFormReport(form.id); };
            taskElement.innerHTML = `
                <div class="card-header">
                    <h3 class="card-item-title">${form.title || 'Untitled Form'}</h3>
                    <p class="card-item-meta">${form.client || 'No Client'} • ${form.category || 'General'}</p>
                </div>
                <div class="card-footer">
                    <span class="card-status-pill ${form.status}">${form.status.charAt(0).toUpperCase() + form.status.slice(1)}</span>
                </div>
            `;
            todayTasksList.appendChild(taskElement);
        });
    }
}

async function populateCategoryFilter() {
    const categories = [...new Set(allFormsMetadata.map(form => form.category).filter(Boolean))];
    filterCategory.innerHTML = `<option value="all">All</option>`;
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        filterCategory.appendChild(option);
    });
}

// --- New Form Page Logic ---
const formTitleNew = document.getElementById('formTitleNew');
const formClientNew = document.getElementById('formClientNew');
const formCategoryNew = document.getElementById('formCategoryNew');
const formStatusNew = document.getElementById('formStatusNew');
const initialNotesNew = document.getElementById('initialNotesNew');
const saveCharacteristicsButtonNew = document.getElementById('saveCharacteristicsButtonNew');
const formIdentifierNewForm = document.getElementById('formIdentifierNewForm');
const transcriptionContentNew = document.getElementById('transcriptionContentNew');
const detailsAccordionHeaderNew = document.getElementById('detailsAccordionHeaderNew');
const detailsAccordionContentNew = detailsAccordionHeaderNew.nextElementSibling;
const accordionIconNew = detailsAccordionHeaderNew.querySelector('.accordion-icon');
const plannedDateNew = document.getElementById('plannedDateNew');

const dictationButton = document.getElementById('dictationButton');
const pausePlayButtonNew = document.getElementById('pausePlayButtonNew');
const copyButtonNew = document.getElementById('copyButtonNew');
const editButtonNew = document.getElementById('editButtonNew');
const deleteButtonNew = document.getElementById('deleteButtonNew');
const pulsatingLedNew = document.getElementById('pulsatingLedNew');
const chronometerNew = document.getElementById('chronometerNew');

let currentFormId = null;
let isDictating = false;
let isPaused = false;
let recognition;
let dictatedText = '';

function updatePlayerUI(state) {
    if (state === 'recording') {
        dictationButton.style.display = 'none';
        pausePlayButtonNew.style.display = 'flex';
        pausePlayButtonNew.innerHTML = pauseIconSVG;
        pulsatingLedNew.classList.add('active');

        copyButtonNew.disabled = true;
        editButtonNew.disabled = true;
        deleteButtonNew.disabled = true;
        copyButtonNew.classList.add('disabled');
        editButtonNew.classList.add('disabled');
        deleteButtonNew.classList.add('disabled');

    } else if (state === 'paused') {
        pausePlayButtonNew.innerHTML = playIconSVG;
        pulsatingLedNew.classList.remove('active');

    } else {
        dictationButton.style.display = 'flex';
        pausePlayButtonNew.style.display = 'none';
        pulsatingLedNew.classList.remove('active');
        pausePlayButtonNew.innerHTML = pauseIconSVG;
        resetChronometer('chronometerNew');

        if (currentFormId && dictatedText.trim().length > 0) {
            copyButtonNew.disabled = false;
            editButtonNew.disabled = false;
            deleteButtonNew.disabled = false;
            copyButtonNew.classList.remove('disabled');
            editButtonNew.classList.remove('disabled');
            deleteButtonNew.classList.remove('disabled');
        } else {
            copyButtonNew.disabled = true;
            editButtonNew.disabled = true;
            deleteButtonNew.disabled = true;
            copyButtonNew.classList.add('disabled');
            editButtonNew.classList.add('disabled');
            deleteButtonNew.classList.add('disabled');
        }
    }
}

async function createNewFormMetadata() {
    let lastFormSequenceNumber = (await idbKeyval.get('lastFormSequenceNumber')) || 0;
    const newFormNumber = ++lastFormSequenceNumber;
    await idbKeyval.set('lastFormSequenceNumber', newFormNumber);
    
    currentFormId = generateUUID();
    const now = new Date();
    
    const formData = {
        id: currentFormId,
        formNumber: newFormNumber,
        title: formTitleNew.value || `Form #${newFormNumber}`,
        client: formClientNew.value,
        category: formCategoryNew.value,
        status: formStatusNew.value,
        notes: initialNotesNew.value,
        plannedDate: plannedDateNew.value, // Added plannedDate here
        createdAt: now.toISOString(),
        lastModified: now.toISOString(),
        segments: [],
    };
    
    allFormsMetadata.unshift(formData);
    await idbKeyval.set('formsMetadata', allFormsMetadata);
    
    formIdentifierNewForm.textContent = `Form #${newFormNumber}`;
    formIdentifierNewForm.style.display = 'block';
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
        isPaused = false;
        updatePlayerUI('recording');
        startChronometer('chronometerNew');
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
        transcriptionContentNew.textContent = dictatedText + finalTranscript + interimTranscript;
        transcriptionContentNew.scrollTop = transcriptionContentNew.scrollHeight;
    };

    recognition.onend = () => {
        isDictating = false;
        isPaused = false;
        updatePlayerUI('stopped');
        stopChronometer();

        if (transcriptionContentNew.textContent.trim().length > 0) {
            saveDictatedSegment(transcriptionContentNew.textContent);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopDictation();
    };

    if (transcriptionContentNew.textContent.includes("Press \"Dictate\" to start...")) {
        transcriptionContentNew.textContent = '';
    }
    dictatedText = transcriptionContentNew.textContent.trim();
    recognition.start();
}

function stopDictation() {
    if (recognition) {
        recognition.stop();
    }
}

function pauseDictation() {
    if (isDictating && !isPaused) {
        isPaused = true;
        updatePlayerUI('paused');
        stopChronometer();
        dictatedText = transcriptionContentNew.textContent.trim();
        recognition.stop();
    }
}

function continueDictation() {
    if (!isDictating && isPaused) {
        isPaused = false;
        updatePlayerUI('recording');
        startChronometer('chronometerNew');
        dictatedText = transcriptionContentNew.textContent.trim();
        startDictation();
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
        tasks: [],
    };
    
    formRecordings.unshift(segmentMetaData);
    await idbKeyval.set(`formRecordings-${currentFormId}`, formRecordings);
}

function copyToClipboardNew() {
    if (transcriptionContentNew.textContent.trim().length > 0) {
        navigator.clipboard.writeText(transcriptionContentNew.textContent).then(() => {
            alert('Text copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        });
    }
}

async function deleteFormAndRedirect() {
    if (currentFormId) {
        if (confirm('Are you sure you want to discard this form?')) {
            let allForms = (await idbKeyval.get('formsMetadata')) || [];
            allForms = allForms.filter(f => f.id !== currentFormId);
            await idbKeyval.set('formsMetadata', allForms);

            await idbKeyval.del(`formRecordings-${currentFormId}`);
            
            resetNewFormState();
            navigateTo('my-forms-page', 'My Forms', true);
        }
    }
}

function resetNewFormState() {
    currentFormId = null;
    isDictating = false;
    isPaused = false;
    dictatedText = '';
    
    formIdentifierNewForm.textContent = 'Form #';
    formIdentifierNewForm.style.display = 'none';
    transcriptionContentNew.textContent = 'Press "Dictate" to start...';
    formTitleNew.value = '';
    formClientNew.value = '';
    formCategoryNew.value = '';
    formStatusNew.value = 'not-started';
    initialNotesNew.value = '';
    plannedDateNew.value = ''; // Added to reset planned date

    updatePlayerUI('stopped');
}


// --- Form Report Page Logic ---
const formIdentifierReport = document.getElementById('formIdentifierReport');
const formTitleReport = document.getElementById('formTitleReport');
const formClientReport = document.getElementById('formClientReport');
const formCategoryReport = document.getElementById('formCategoryReport');
const formStatusReport = document.getElementById('formStatusReport');
const initialNotesReport = document.getElementById('initialNotesReport');
const transcriptionContentReport = document.getElementById('transcriptionContentReport');
const detailsAccordionHeaderReport = document.getElementById('detailsAccordionHeaderReport');
const detailsAccordionContentReport = detailsAccordionHeaderReport.nextElementSibling;
const accordionIconReport = detailsAccordionHeaderReport.querySelector('.accordion-icon');
const plannedDateReport = document.getElementById('plannedDateReport');

const pausePlayButtonReport = document.getElementById('pausePlayButtonReport');
const copyButtonReport = document.getElementById('copyButtonReport');
const saveButtonReport = document.getElementById('saveButtonReport');
const deleteFormButtonReport = document.getElementById('deleteFormButtonReport');
const pulsatingLedReport = document.getElementById('pulsatingLedReport');
const chronometerReport = document.getElementById('chronometerReport');
const saveCharacteristicsButtonReport = document.getElementById('saveCharacteristicsButtonReport');


let currentFormReportId = null;
let currentFormRecordings = '';
let isPlaying = false;
let playbackInterval;
let playbackTextIndex = 0;
const typingSpeed = 20;

async function loadFormReportContent(formId) {
    let allForms = (await idbKeyval.get('formsMetadata')) || [];
    let currentFormMetadata = allForms.find(f => f.id === formId);

    if (!currentFormMetadata) {
        appTitle.textContent = 'Error: Form not found.';
        transcriptionContentReport.textContent = '';
        return;
    }
    
    setupAccordion('detailsAccordionHeaderReport');

    currentFormReportId = formId;
    appTitle.textContent = currentFormMetadata.title || `Form #${currentFormMetadata.formNumber || 'N/A'}`;
    formIdentifierReport.textContent = `Form #${currentFormMetadata.formNumber || 'N/A'}`;
    formIdentifierReport.style.display = 'block';

    formTitleReport.value = currentFormMetadata.title || '';
    formClientReport.value = currentFormMetadata.client || '';
    formCategoryReport.value = currentFormMetadata.category || '';
    formStatusReport.value = currentFormMetadata.status || 'not-started';
    initialNotesReport.value = currentFormMetadata.notes || '';
    plannedDateReport.value = currentFormMetadata.plannedDate || ''; // Added to load planned date

    const formRecordings = (await idbKeyval.get(`formRecordings-${formId}`)) || [];
    currentFormRecordings = formRecordings.map(s => s.text).join(' ');
    transcriptionContentReport.textContent = currentFormRecordings.trim() || 'This form contains no transcribed text yet.';
    
    updateReportPlayerUI('stopped');
}

function updateReportPlayerUI(state) {
    if (state === 'playing') {
        pausePlayButtonReport.innerHTML = pauseIconSVG;
        pulsatingLedReport.classList.add('active');
    } else {
        pausePlayButtonReport.innerHTML = playIconSVG;
        pulsatingLedReport.classList.remove('active');
    }
}

function startPlayback() {
    if (isPlaying) return;
    isPlaying = true;
    updateReportPlayerUI('playing');
    
    startChronometer('chronometerReport');
    
    let fullText = currentFormRecordings;
    transcriptionContentReport.textContent = '';
    
    let playbackTypingInterval = setInterval(() => {
        if (!isPlaying) {
            clearInterval(playbackTypingInterval);
            return;
        }
        if (playbackTextIndex < fullText.length) {
            transcriptionContentReport.textContent += fullText[playbackTextIndex];
            transcriptionContentReport.scrollTop = transcriptionContentReport.scrollHeight;
            playbackTextIndex++;
        } else {
            clearInterval(playbackTypingInterval);
            stopPlayback();
        }
    }, typingSpeed);
}

function pausePlayback() {
    isPlaying = false;
    updateReportPlayerUI('paused');
    stopChronometer();
}

function stopPlayback() {
    isPlaying = false;
    updateReportPlayerUI('stopped');
    stopChronometer();
    playbackTextIndex = 0;
    loadFormReportContent(currentFormReportId);
}

async function saveReportChanges() {
    if (!currentFormReportId) return;
    
    let formIndex = allFormsMetadata.findIndex(f => f.id === currentFormReportId);

    if (formIndex !== -1) {
        allFormsMetadata[formIndex].title = formTitleReport.value;
        allFormsMetadata[formIndex].client = formClientReport.value;
        allFormsMetadata[formIndex].category = formCategoryReport.value;
        allFormsMetadata[formIndex].status = formStatusReport.value;
        allFormsMetadata[formIndex].notes = initialNotesReport.value;
        allFormsMetadata[formIndex].plannedDate = plannedDateReport.value; // Added to save planned date
        allFormsMetadata[formIndex].lastModified = new Date().toISOString();
        await idbKeyval.set('formsMetadata', allFormsMetadata);

        if (currentFormRecordings.length > 0) {
            let formRecordings = (await idbKeyval.get(`formRecordings-${currentFormReportId}`)) || [];
            formRecordings[0].text = transcriptionContentReport.textContent;
            await idbKeyval.set(`formRecordings-${currentFormReportId}`, formRecordings);
        }
        alert('Changes saved successfully!');
    }
}

async function deleteReportForm() {
    if (!currentFormReportId) return;
    if (confirm('Are you sure you want to delete this form? This action is irreversible.')) {
        allFormsMetadata = allFormsMetadata.filter(f => f.id !== currentFormReportId);
        await idbKeyval.set('formsMetadata', allFormsMetadata);
        await idbKeyval.del(`formRecordings-${currentFormReportId}`);
        alert('Form has been deleted successfully.');
        navigateTo('my-forms-page', 'My Forms', true);
    }
}


// --- Event Listeners for Navigation and My Forms Page ---
myFormsNav.addEventListener('click', async (e) => {
    e.preventDefault();
    navigateTo('my-forms-page', 'My Forms', true);
});

newFormNav.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('new-form-page', 'New Form');
});

searchFormsInput.addEventListener('input', debounce(() => {
    renderFormsList(searchFormsInput.value, filterStatus.value, filterDate.value, filterCategory.value);
}, 300));

filterStatus.addEventListener('change', () => {
    renderFormsList(searchFormsInput.value, filterStatus.value, filterDate.value, filterCategory.value);
});

filterDate.addEventListener('change', () => {
    renderFormsList(searchFormsInput.value, filterStatus.value, filterDate.value, filterCategory.value);
});

filterCategory.addEventListener('change', () => {
    renderFormsList(searchFormsInput.value, filterStatus.value, filterDate.value, filterCategory.value);
});

// New Form Page - Event Listeners
dictationButton.addEventListener('click', async () => {
    if (!currentFormId) {
        await createNewFormMetadata();
    }
    startDictation();
});

pausePlayButtonNew.addEventListener('click', () => {
    if (isDictating && !isPaused) {
        pauseDictation();
    } else if (!isDictating && isPaused) {
        continueDictation();
    }
});

copyButtonNew.addEventListener('click', copyToClipboardNew);

editButtonNew.addEventListener('click', () => {
    if (currentFormId) {
        navigateToFormReport(currentFormId);
    }
});

deleteButtonNew.addEventListener('click', deleteFormAndRedirect);

detailsAccordionHeaderNew.addEventListener('click', () => {
    const isExpanded = detailsAccordionContentNew.classList.contains('expanded');
    accordionIconNew.classList.toggle('expanded');
    detailsAccordionContentNew.classList.toggle('expanded');
    
    if (isExpanded) {
        detailsAccordionContentNew.style.maxHeight = null;
    } else {
        detailsAccordionContentNew.style.maxHeight = detailsAccordionContentNew.scrollHeight + "px";
    }
});

saveCharacteristicsButtonNew.addEventListener('click', async () => {
    if (!currentFormId) {
        await createNewFormMetadata();
    }
    
    const formToUpdateIndex = allFormsMetadata.findIndex(f => f.id === currentFormId);
    if (formToUpdateIndex !== -1) {
        allFormsMetadata[formToUpdateIndex].title = formTitleNew.value;
        allFormsMetadata[formToUpdateIndex].client = formClientNew.value;
        allFormsMetadata[formToUpdateIndex].category = formCategoryNew.value;
        allFormsMetadata[formToUpdateIndex].status = formStatusNew.value;
        allFormsMetadata[formToUpdateIndex].notes = initialNotesNew.value;
        allFormsMetadata[formToUpdateIndex].plannedDate = plannedDateNew.value;
        allFormsMetadata[formToUpdateIndex].lastModified = new Date().toISOString();
        await idbKeyval.set('formsMetadata', allFormsMetadata);
        alert('Characteristics saved!');
    }
    
    if (detailsAccordionContentNew.classList.contains('expanded')) {
        detailsAccordionHeaderNew.click();
    }
});


// Form Report Page - Event Listeners
pausePlayButtonReport.addEventListener('click', () => {
    if (!isPlaying) {
        startPlayback();
    } else {
        pausePlayback();
    }
});

copyButtonReport.addEventListener('click', async () => {
    if (transcriptionContentReport.textContent) {
        try {
            await navigator.clipboard.writeText(transcriptionContentReport.textContent);
            alert('Text copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        }
    }
});

saveButtonReport.addEventListener('click', saveReportChanges);
deleteFormButtonReport.addEventListener('click', deleteReportForm);
saveCharacteristicsButtonReport.addEventListener('click', async () => {
    await saveReportChanges();
    if (detailsAccordionContentReport.classList.contains('expanded')) {
        detailsAccordionHeaderReport.click();
    }
});

detailsAccordionHeaderReport.addEventListener('click', () => {
    const isExpanded = detailsAccordionContentReport.classList.contains('expanded');
    accordionIconReport.classList.toggle('expanded');
    detailsAccordionContentReport.classList.toggle('expanded');
    if (isExpanded) {
        detailsAccordionContentReport.style.maxHeight = null;
    } else {
        detailsAccordionContentReport.style.maxHeight = detailsAccordionContentReport.scrollHeight + "px";
    }
});


// --- Initial Data Loading and Page Setup ---
async function loadInitialData() {
    allFormsMetadata = (await idbKeyval.get('formsMetadata')) || [];
    populateCategoryFilter();
    renderTodayTasks();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();
    navigateTo('my-forms-page', 'My Forms', true);
});

window.navigateToFormReport = navigateToFormReport;
