// main.js - Refactored logic for the New Form page

// DOM Elements
const appTitle = document.querySelector('.app-title');
const transcriptionContent = document.getElementById('transcriptionContent');
const detailsAccordionHeader = document.getElementById('detailsAccordionHeader');
const detailsAccordionContent = document.querySelector('.accordion-content');
const accordionIcon = document.querySelector('.accordion-icon');
const formIdentifierBadge = document.getElementById('formIdentifier');

// Player controls for the new compact design
const dictationButton = document.getElementById('dictationButton');
const pausePlayButton = document.getElementById('pausePlayButton');
const copyButton = document.getElementById('copyButton');
const editButton = document.getElementById('editButton');
const deleteButton = document.getElementById('deleteButton');
const pulsatingLed = document.getElementById('pulsatingLed');
const chronometer = document.getElementById('chronometer');

// Metadata fields and save button
const formTitleInput = document.getElementById('formTitle');
const formClientInput = document.getElementById('formClient');
const formCategoryInput = document.getElementById('formCategory');
const formStatusSelect = document.getElementById('formStatus');
const initialNotesInput = document.getElementById('initialNotes');
const saveCharacteristicsButton = document.getElementById('saveCharacteristicsButton');

// Global state variables
let currentFormId = null;
let isDictating = false;
let isPaused = false;
let simulatedDictatedText = "";
let dictationTypingInterval;
let chronometerInterval;
let seconds = 0;
let textToResumeFrom = "";

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function updatePlayerUI(state) {
    if (state === 'recording') {
        dictationButton.style.display = 'none';
        pausePlayButton.style.display = 'flex';
        pausePlayButton.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        pulsatingLed.classList.add('active');

        copyButton.disabled = true;
        editButton.disabled = true;
        deleteButton.disabled = true;

    } else if (state === 'paused') {
        pausePlayButton.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>`;
        pulsatingLed.classList.remove('active');

    } else { // 'stopped'
        dictationButton.style.display = 'flex';
        pausePlayButton.style.display = 'none';
        pulsatingLed.classList.remove('active');
        pausePlayButton.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

        seconds = 0;
        chronometer.textContent = '0:00';

        if (currentFormId && transcriptionContent.textContent.trim().length > 0) {
            copyButton.disabled = false;
            editButton.disabled = false;
            deleteButton.disabled = false;
        } else {
            copyButton.disabled = true;
            editButton.disabled = true;
            deleteButton.disabled = true;
        }
    }
}

function updateChronometer() {
    seconds++;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    chronometer.textContent = `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function startDictationProcess() {
    isDictating = true;
    isPaused = false;
    
    if (transcriptionContent.textContent.includes("Press \"Dictate\" to start...")) {
        transcriptionContent.textContent = '';
    }

    updatePlayerUI('recording');
    
    clearInterval(chronometerInterval);
    chronometerInterval = setInterval(updateChronometer, 1000);

    let textSegments = [
        "Today I had a meeting with the client Popescu. We discussed the investment opportunity in project B. I extracted two important tasks: checking legality and sending an offer by the end of the week. In addition, I noted a question about long-term risks. I will come back with a follow-up tomorrow. This is a very long text to test the scroll functionality of the transcription box. We want to make sure that as the text grows, the scroll bar appears and the text display remains within its designated area. This is a crucial UX feature for long dictations. The application needs to handle continuous input smoothly. The text will continue to expand until it fills the container, forcing the scrollbar to become visible. This ensures the user can always see the latest transcribed text without the container growing indefinitely. This will be an important feature for managers and inspectors who have long recordings. We are almost at the end of the test text. The final line should appear now. And that is the end of the dictated text.",
    ];
    let fullText = textToResumeFrom + textSegments[0];
    let charIndex = textToResumeFrom.length;

    dictationTypingInterval = setInterval(() => {
        if (!isDictating || isPaused || charIndex >= fullText.length) {
            clearInterval(dictationTypingInterval);
            if (charIndex >= fullText.length) {
                stopDictationProcessAndSave();
            }
            return;
        }

        simulatedDictatedText += fullText[charIndex];
        transcriptionContent.textContent = simulatedDictatedText;
        transcriptionContent.scrollTop = transcriptionContent.scrollHeight;
        charIndex++;
    }, 20);
}

function stopDictationProcessAndSave() {
    isDictating = false;
    isPaused = false;
    clearInterval(dictationTypingInterval);
    clearInterval(chronometerInterval);

    if (simulatedDictatedText.trim().length > 0) {
        saveDictatedSegment(simulatedDictatedText);
        textToResumeFrom = simulatedDictatedText;
    } else {
        transcriptionContent.textContent = 'Press "Dictate" to start...';
        textToResumeFrom = "";
    }
    updatePlayerUI('stopped');
}

function pauseDictation() {
    if (!isDictating || isPaused) return;
    isPaused = true;
    clearInterval(dictationTypingInterval);
    clearInterval(chronometerInterval);
    updatePlayerUI('paused');
}

function continueDictation() {
    if (!isDictating || !isPaused) return;
    isPaused = false;
    updatePlayerUI('recording');
    startDictationProcess();
}

async function createOrUpdateFormMetadata() {
    let allForms = (await idbKeyval.get('formsMetadata')) || [];
    let lastFormSequenceNumber = (await idbKeyval.get('lastFormSequenceNumber')) || 0;
    const newFormNumber = ++lastFormSequenceNumber;
    await idbKeyval.set('lastFormSequenceNumber', newFormNumber);
    
    currentFormId = generateUUID();
    const now = new Date();
    
    const formData = {
        id: currentFormId,
        formNumber: newFormNumber,
        title: formTitleInput.value || `Form #${newFormNumber}`,
        client: formClientInput.value,
        category: formCategoryInput.value,
        status: formStatusSelect.value,
        notes: initialNotesInput.value,
        createdAt: now.toISOString(),
        lastModified: now.toISOString(),
        segments: [],
    };
    
    allForms.unshift(formData);
    await idbKeyval.set('formsMetadata', allForms);
    
    formIdentifierBadge.textContent = `Form #${newFormNumber}`;
    formIdentifierBadge.style.display = 'block';
    
    return formData;
}

async function saveDictatedSegment(text) {
    if (!currentFormId) {
        await createOrUpdateFormMetadata();
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

function exportTranscription() {
    const textToExport = transcriptionContent.textContent;
    if (textToExport && textToExport !== 'Press "Dictate" to start...') {
        const blob = new Blob([textToExport], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `form-transcription-${currentFormId || 'untitled'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

async function saveCharacteristicsAndCloseAccordion() {
    if (!currentFormId) {
        await createOrUpdateFormMetadata();
    }
    
    let allForms = (await idbKeyval.get('formsMetadata')) || [];
    const formToUpdate = allForms.find(f => f.id === currentFormId);

    if (formToUpdate) {
        formToUpdate.title = formTitleInput.value;
        formToUpdate.client = formClientInput.value;
        formToUpdate.category = formCategoryInput.value;
        formToUpdate.status = formStatusSelect.value;
        formToUpdate.notes = initialNotesInput.value;
        formToUpdate.lastModified = new Date().toISOString();
        await idbKeyval.set('formsMetadata', allForms);
        alert('Characteristics saved!');
    }

    const isExpanded = detailsAccordionContent.classList.contains('expanded');
    if (isExpanded) {
        accordionIcon.classList.remove('expanded');
        detailsAccordionContent.classList.remove('expanded');
        detailsAccordionContent.style.maxHeight = null;
    }
}

// Event Listeners
dictationButton.addEventListener('click', async () => {
    if (!currentFormId) {
        await createOrUpdateFormMetadata();
    }
    startDictationProcess();
});

pausePlayButton.addEventListener('click', () => {
    if (isDictating && !isPaused) {
        pauseDictation();
    } else if (isDictating && isPaused) {
        continueDictation();
    }
});

editButton.addEventListener('click', () => {
    if (currentFormId) {
        window.location.href = `form-report.html?id=${currentFormId}`;
    }
});

copyButton.addEventListener('click', async () => {
    if (currentFormId && transcriptionContent.textContent.trim().length > 0) {
        try {
            await navigator.clipboard.writeText(transcriptionContent.textContent);
            alert('Text copied to clipboard!');
            // Also save the form when copying
            await saveDictatedSegment(transcriptionContent.textContent);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        }
    }
});

deleteButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to discard this form?')) {
        simulatedDictatedText = '';
        textToResumeFrom = '';
        transcriptionContent.textContent = 'Press "Dictate" to start...';
        stopDictationProcessAndSave();
    }
});

detailsAccordionHeader.addEventListener('click', () => {
    const isExpanded = detailsAccordionContent.classList.contains('expanded');
    accordionIcon.classList.toggle('expanded');
    detailsAccordionContent.classList.toggle('expanded');
    
    if (isExpanded) {
        detailsAccordionContent.style.maxHeight = null;
    } else {
        detailsAccordionContent.style.maxHeight = detailsAccordionContent.scrollHeight + "px";
    }
});

saveCharacteristicsButton.addEventListener('click', saveCharacteristicsAndCloseAccordion);

document.addEventListener('DOMContentLoaded', () => {
    const headerSearchInput = document.getElementById('headerSearchInput');
    headerSearchInput.style.display = 'none';

    updatePlayerUI('stopped');
});
