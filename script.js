"use strict";

// --- CONSTANTES Y ESTADO GLOBAL ---
const API_URL = 'https://signalcheck-pro-api.vercel.app/verify-license';
const LICENSE_STORAGE_KEY = 'signalcheck_pro_license_status';
const { jsPDF } = window.jspdf;
Chart.register(ChartDataLabels);

let sessionState = { executingCompany: '', companyLogo: null };
let calibrationState = {};
let isValidated = false;
let activeNumericInput = null;
let cursorSpan = null;

// --- LÓGICA DE LICENCIAMIENTO ---
async function generateFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const renderer = gl ? gl.getParameter(gl.RENDERER) : 'no-webgl';
    const data = [navigator.userAgent, screen.width + 'x' + screen.height, navigator.language, new Date().getTimezoneOffset(), renderer].join('||');
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleActivation() {
    const activateBtn = document.getElementById('activateBtn');
    const licenseKeyInput = document.getElementById('licenseKey');
    const licenseKey = licenseKeyInput.value.trim().toUpperCase();

    if (!licenseKey) {
        showActivationError('Por favor, introduce una clave de licencia.');
        return;
    }

    activateBtn.classList.add('loading');
    activateBtn.disabled = true;
    hideActivationError();

    try {
        const fingerprint = await generateFingerprint();
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseKey, fingerprint })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            localStorage.setItem(LICENSE_STORAGE_KEY, 'VALID');
            activateBtn.classList.remove('loading');
            
            const newButton = activateBtn.cloneNode(true);
            newButton.textContent = 'Ingresa a SignalCheck PRO';
            newButton.style.backgroundColor = 'var(--export-button-bg)';
            activateBtn.parentNode.replaceChild(newButton, activateBtn);
            
            newButton.addEventListener('click', () => {
                window.location.reload();
            });
            newButton.disabled = false;
        } else {
            showActivationError(data.message || 'Error desconocido.');
            activateBtn.classList.remove('loading');
            activateBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error de red al activar:', error);
        showActivationError('Error de conexión. Verifica tu acceso a internet.');
        activateBtn.classList.remove('loading');
        activateBtn.disabled = false;
    }
}

function showActivationError(message) {
    const activationErrorDiv = document.getElementById('activation-error-message');
    activationErrorDiv.textContent = message;
    activationErrorDiv.classList.remove('hidden');
}

function hideActivationError() {
    const activationErrorDiv = document.getElementById('activation-error-message');
    activationErrorDiv.classList.add('hidden');
}

function checkLicenseAndInitialize() {
    const licenseStatus = localStorage.getItem(LICENSE_STORAGE_KEY);
    const activationStep = document.getElementById('step-0-activation');
    const mainAppSteps = document.querySelectorAll('#step-1-datasheet, #step-2-calibration, #step-3-report');

    if (licenseStatus === 'VALID') {
        activationStep.style.display = 'none';
        mainAppSteps.forEach(step => step.style.display = '');
        document.getElementById('step-1-datasheet').classList.add('active');
        initializeMainApp(); // <-- INICIALIZACIÓN CRÍTICA
    } else {
        activationStep.classList.add('active');
        mainAppSteps.forEach(step => step.style.display = 'none');
    }
}

// --- CÓDIGO FUNCIONAL DE LA APLICACIÓN ---
let steps, formSteps, instrumentForm, nextBtn1, nextBtn2, backBtn1, backBtn2, backToStep1Btn, validateBtn, resetMeasurementBtn, generatePdfBtn, fullResetBtn, errorMessageDiv, idealValuesCells, measuredInputs, errorValuesCells, idealUnitSpan, measuredUnitSpan, summaryEquationP, clientTypeSelect, clientNameGroup, protocolSelect, protocolOtherGroup, logoUploadContainer, logoInput, logoPreviewContainer, logoPreview, removeLogoBtn, pvUnitSelect, pvUnitOtherGroup, customKeyboard;

function initializeMainApp() {
    // Definición de todos los elementos del DOM
    steps = { /* ... Tu código original de 'steps' ... */ };
    // ... Todos tus otros selectores del DOM van aquí ...
    instrumentForm = document.getElementById('instrumentForm');
    nextBtn1 = document.getElementById('nextBtn1');
    nextBtn2 = document.getElementById('nextBtn2');
    backBtn1 = document.getElementById('backBtn1');
    backBtn2 = document.getElementById('backBtn2');
    backToStep1Btn = document.getElementById('backToStep1Btn');
    validateBtn = document.getElementById('validateBtn');
    resetMeasurementBtn = document.getElementById('resetMeasurementBtn');
    generatePdfBtn = document.getElementById('generatePdfBtn');
    fullResetBtn = document.getElementById('fullResetBtn');
    errorMessageDiv = document.getElementById('error-message');
    idealValuesCells = document.querySelectorAll('#ideal-values-row td:not(:first-child)');
    measuredInputs = document.querySelectorAll('.measured-input');
    errorValuesCells = document.querySelectorAll('#error-values-row td:not(:first-child)');
    idealUnitSpan = document.getElementById('ideal-unit');
    measuredUnitSpan = document.getElementById('measured-unit');
    summaryEquationP = document.getElementById('summary-equation');
    clientTypeSelect = document.getElementById('clientType');
    clientNameGroup = document.getElementById('clientNameGroup');
    protocolSelect = document.getElementById('protocol');
    protocolOtherGroup = document.getElementById('protocolOtherGroup');
    logoUploadContainer = document.getElementById('logo-upload-container');
    logoInput = document.getElementById('logoInput');
    logoPreviewContainer = document.getElementById('logo-preview-container');
    logoPreview = document.getElementById('logo-preview');
    removeLogoBtn = document.getElementById('removeLogoBtn');
    pvUnitSelect = document.getElementById('pvUnit');
    pvUnitOtherGroup = document.getElementById('pvUnitOtherGroup');
    customKeyboard = document.getElementById('custom-keyboard');
    
    // Asignación de todos los event listeners
    if(nextBtn1) nextBtn1.addEventListener('click', () => { if (validateFormStep('1a')) { hideError(); navigateToFormStep('1b'); } });
    if(backBtn1) backBtn1.addEventListener('click', () => navigateToFormStep('1a'));
    if(nextBtn2) nextBtn2.addEventListener('click', () => { if (validateFormStep('1b')) { hideError(); sessionState.executingCompany = sanitizeHTML(document.getElementById('executingCompany').value); navigateToFormStep('1c'); } });
    if(backBtn2) backBtn2.addEventListener('click', () => navigateToFormStep('1b'));
    if(backToStep1Btn) backToStep1Btn.addEventListener('click', () => navigateToAppStep('step1'));
    if(clientTypeSelect) clientTypeSelect.addEventListener('change', () => { clientNameGroup.classList.toggle('hidden', clientTypeSelect.value !== 'Externo'); });
    if(protocolSelect) protocolSelect.addEventListener('change', () => { protocolOtherGroup.classList.toggle('hidden', protocolSelect.value !== 'Otro'); });
    if(pvUnitSelect) pvUnitSelect.addEventListener('change', () => { pvUnitOtherGroup.classList.toggle('hidden', pvUnitSelect.value !== 'custom'); });
    if(logoUploadContainer) logoUploadContainer.addEventListener('click', () => logoInput.click());
    if(logoInput) logoInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                sessionState.companyLogo = e.target.result;
                logoPreview.src = e.target.result;
                logoPreviewContainer.classList.remove('hidden');
                logoUploadContainer.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        } else { showError('Por favor, seleccione un archivo de imagen válido (.jpg o .png).'); }
    });
    if(removeLogoBtn) removeLogoBtn.addEventListener('click', () => {
        sessionState.companyLogo = null;
        logoInput.value = '';
        logoPreviewContainer.classList.add('hidden');
        logoUploadContainer.classList.remove('hidden');
    });
    if(customKeyboard) customKeyboard.addEventListener('click', (e) => {
        if (!e.target.matches('.keyboard-btn') || !activeNumericInput) return;
        const key = e.target.dataset.key;
        let value = activeNumericInput.textContent.replace(/<span class="cursor"><\/span>/g, '');
        switch (key) {
            case 'ok':
                customKeyboard.classList.remove('visible');
                if(activeNumericInput) activeNumericInput.classList.remove('active-input');
                if(cursorSpan) cursorSpan.remove();
                activeNumericInput = null;
                cursorSpan = null;
                break;
            case 'backspace': value = value.slice(0, -1); break;
            case '.': if (!value.includes('.')) value += '.'; break;
            case '-': if (value.length === 0) value += '-'; break;
            default: value += key; break;
        }
        activeNumericInput.innerHTML = '';
        activeNumericInput.textContent = value;
        updateCursor();
    });
    if(instrumentForm) instrumentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        hideError();
        let protocolValue = sanitizeHTML(document.getElementById('protocol').value);
        if (protocolValue === 'Otro') protocolValue = sanitizeHTML(document.getElementById('protocolOther').value);
        let pvUnitValue = sanitizeHTML(document.getElementById('pvUnit').value);
        if (pvUnitValue === 'custom') pvUnitValue = sanitizeHTML(document.getElementById('pvUnitOther').value);
        calibrationState.instrumentData = {
            tag: sanitizeHTML(document.getElementById('tag').value),
            instrumentType: sanitizeHTML(document.getElementById('instrumentType').value),
            brand: sanitizeHTML(document.getElementById('brand').value),
            model: sanitizeHTML(document.getElementById('model').value),
            serialNumber: sanitizeHTML(document.getElementById('serialNumber').value),
            power: sanitizeHTML(document.getElementById('power').value),
            protocol: protocolValue,
            workArea: sanitizeHTML(document.getElementById('workArea').value),
            lrv: parseFloat(getValue(document.getElementById('lrv'))),
            urv: parseFloat(getValue(document.getElementById('urv'))),
            pvUnit: pvUnitValue,
            workOrder: sanitizeHTML(document.getElementById('workOrder').value),
            calibrator: sanitizeHTML(document.getElementById('calibrator').value),
            calibratorSerialNumber: sanitizeHTML(document.getElementById('calibratorSerialNumber').value),
            technician: sanitizeHTML(document.getElementById('technician').value),
            testType: sanitizeHTML(document.getElementById('testType').value),
            testCondition: sanitizeHTML(document.getElementById('testCondition').value),
            permissibleError: parseFloat(getValue(document.getElementById('permissibleError'))),
            workLead: sanitizeHTML(document.getElementById('workLead').value),
            supervisor: sanitizeHTML(document.getElementById('supervisor').value),
            calibratorLastCal: document.getElementById('calibratorLastCal').value,
            calibratorCalDue: document.getElementById('calibratorCalDue').value,
            clientType: sanitizeHTML(document.getElementById('clientType').value),
            clientName: sanitizeHTML(document.getElementById('clientName').value)
        };
        prepareCalibrationStep();
        navigateToAppStep('step2');
    });
    if(validateBtn) validateBtn.addEventListener('click', () => {
        if (!isValidated) {
            if (validateMeasuredInputs()) {
                calculateAndDisplayErrors();
                isValidated = true;
                validateBtn.textContent = 'Continuar';
                resetMeasurementBtn.disabled = true;
                backToStep1Btn.disabled = true;
            }
        } else { prepareReportStep(); navigateToAppStep('step3'); }
    });
    if(resetMeasurementBtn) resetMeasurementBtn.addEventListener('click', () => {
        measuredInputs.forEach(input => input.textContent = '');
        errorValuesCells.forEach(cell => {
            cell.textContent = '-';
            cell.classList.remove('error-ok', 'error-fail');
        });
        document.getElementById('error-values-row').classList.add('hidden');
        hideError();
    });
    if(generatePdfBtn) generatePdfBtn.addEventListener('click', generatePDF);
    if(fullResetBtn) fullResetBtn.addEventListener('click', () => {
        localStorage.removeItem(LICENSE_STORAGE_KEY);
        window.location.reload();
    });
    
    // Listener del Teclado (CRÍTICO)
    document.querySelectorAll('.numeric-input-field').forEach(field => {
        field.addEventListener('click', (e) => {
            document.querySelectorAll('.numeric-input-field.active-input').forEach(el => el.classList.remove('active-input'));
            activeNumericInput = e.currentTarget;
            activeNumericInput.classList.add('active-input');
            updateCursor();
            customKeyboard.classList.add('visible');
        });
    });
    
    resetCalibrationState();
}

// El resto de tus funciones auxiliares (sin cambios)
// ... PEGA AQUÍ TODAS TUS FUNCIONES DESDE 'navigateToAppStep' HASTA 'hideError' ...
function navigateToAppStep(stepName) { /* ...código original... */ }
function navigateToFormStep(formStepName) { /* ...código original... */ }
function getValue(element) { /* ...código original... */ }
function isValidNumber(value) { /* ...código original... */ }
function validateFormStep(stepId) { /* ...código original... */ }
function updateCursor() { /* ...código original... */ }
function calculateEquation() { /* ...código original... */ }
function prepareCalibrationStep() { /* ...código original... */ }
function validateMeasuredInputs() { /* ...código original... */ }
function isWithinTolerance(error, tolerance) { /* ...código original... */ }
function calculateAndDisplayErrors() { /* ...código original... */ }
function prepareReportStep() { /* ...código original... */ }
function getChartConfig() { /* ...código original... */ }
function updateChart() { /* ...código original... */ }
async function generatePDF() { /* ...código original... */ }
function showError(message) { /* ...código original... */ }
function hideError() { /* ...código original... */ }

// --- PUNTO DE ENTRADA PRINCIPAL Y SERVICE WORKER ---
document.addEventListener('DOMContentLoaded', () => {
    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) activateBtn.addEventListener('click', handleActivation);
    checkLicenseAndInitialize();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(r => console.log('Service Worker registrado:', r))
      .catch(e => console.log('Fallo en registro de SW:', e));
  });
}
