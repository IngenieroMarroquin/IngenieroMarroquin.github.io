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
    if (activationErrorDiv) {
        activationErrorDiv.textContent = message;
        activationErrorDiv.classList.remove('hidden');
    }
}

function hideActivationError() {
    const activationErrorDiv = document.getElementById('activation-error-message');
    if (activationErrorDiv) {
        activationErrorDiv.classList.add('hidden');
    }
}

function checkLicenseAndInitialize() {
    const licenseStatus = localStorage.getItem(LICENSE_STORAGE_KEY);
    const activationStep = document.getElementById('step-0-activation');
    const mainAppSteps = document.querySelectorAll('#step-1-datasheet, #step-2-calibration, #step-3-report');

    if (licenseStatus === 'VALID') {
        activationStep.style.display = 'none';
        mainAppSteps.forEach(step => step.style.display = '');
        document.getElementById('step-1-datasheet').classList.add('active');
        initializeMainApp();
    } else {
        activationStep.classList.add('active');
        mainAppSteps.forEach(step => step.style.display = 'none');
    }
}

// --- DECLARACIÓN DE TODAS LAS FUNCIONES DE LA APP ---

function navigateToAppStep(stepName) { /* ... Tu código original ... */ }
function navigateToFormStep(formStepName) { /* ... Tu código original ... */ }
function getValue(element) { /* ... Tu código original ... */ }
function isValidNumber(value) { /* ... Tu código original ... */ }
function validateFormStep(stepId) { /* ... Tu código original ... */ }
function updateCursor() { /* ... Tu código original ... */ }
function calculateEquation() { /* ... Tu código original ... */ }
function prepareCalibrationStep() { /* ... Tu código original ... */ }
function validateMeasuredInputs() { /* ... Tu código original ... */ }
function isWithinTolerance(error, tolerance) { /* ... Tu código original ... */ }
function calculateAndDisplayErrors() { /* ... Tu código original ... */ }
function prepareReportStep() { /* ... Tu código original ... */ }
function getChartConfig() { /* ... Tu código original ... */ }
function updateChart() { /* ... Tu código original ... */ }
async function generatePDF() { /* ... Tu código original ... */ }
function showError(message) { /* ... Tu código original ... */ }
function hideError() { /* ... Tu código original ... */ }
function resetCalibrationState() { /* ... Tu código original ... */ }
function sanitizeHTML(str) { /* ... Tu código original ... */ }

// --- PUNTO DE ENTRADA: SE EJECUTA CUANDO LA PÁGINA CARGA ---
document.addEventListener('DOMContentLoaded', () => {
    // Listener de activación siempre presente
    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) activateBtn.addEventListener('click', handleActivation);
    
    // Verifica la licencia y decide si inicializa la app principal
    checkLicenseAndInitialize();
});

// --- INICIALIZADOR DE LA APP PRINCIPAL ---
function initializeMainApp() {
    // Selectores del DOM
    const steps = {
        step1: document.getElementById('step-1-datasheet'),
        step2: document.getElementById('step-2-calibration'),
        step3: document.getElementById('step-3-report')
    };
    const formSteps = {
        '1a': document.getElementById('form-step-1a'),
        '1b': document.getElementById('form-step-1b'),
        '1c': document.getElementById('form-step-1c')
    };
    const instrumentForm = document.getElementById('instrumentForm');
    const nextBtn1 = document.getElementById('nextBtn1');
    const nextBtn2 = document.getElementById('nextBtn2');
    const backBtn1 = document.getElementById('backBtn1');
    const backBtn2 = document.getElementById('backBtn2');
    const backToStep1Btn = document.getElementById('backToStep1Btn');
    const validateBtn = document.getElementById('validateBtn');
    const resetMeasurementBtn = document.getElementById('resetMeasurementBtn');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const fullResetBtn = document.getElementById('fullResetBtn');
    const clientTypeSelect = document.getElementById('clientType');
    const clientNameGroup = document.getElementById('clientNameGroup');
    const protocolSelect = document.getElementById('protocol');
    const protocolOtherGroup = document.getElementById('protocolOtherGroup');
    const logoUploadContainer = document.getElementById('logo-upload-container');
    const logoInput = document.getElementById('logoInput');
    const logoPreviewContainer = document.getElementById('logo-preview-container');
    const logoPreview = document.getElementById('logo-preview');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const pvUnitSelect = document.getElementById('pvUnit');
    const pvUnitOtherGroup = document.getElementById('pvUnitOtherGroup');
    const customKeyboard = document.getElementById('custom-keyboard');
    
    // Asignación de Event Listeners
    if(nextBtn1) nextBtn1.addEventListener('click', () => { if (validateFormStep('1a', formSteps)) { hideError(); navigateToFormStep('1b', formSteps); } });
    if(backBtn1) backBtn1.addEventListener('click', () => navigateToFormStep('1a', formSteps));
    if(nextBtn2) nextBtn2.addEventListener('click', () => { if (validateFormStep('1b', formSteps)) { hideError(); sessionState.executingCompany = sanitizeHTML(document.getElementById('executingCompany').value); navigateToFormStep('1c', formSteps); } });
    if(backBtn2) backBtn2.addEventListener('click', () => navigateToFormStep('1b', formSteps));
    if(backToStep1Btn) backToStep1Btn.addEventListener('click', () => navigateToAppStep('step1', steps));
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
        calibrationState.instrumentData = { /* ... Tu código original ... */ };
        prepareCalibrationStep();
        navigateToAppStep('step2', steps);
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
        } else { prepareReportStep(); navigateToAppStep('step3', steps); }
    });
    if(resetMeasurementBtn) resetMeasurementBtn.addEventListener('click', () => {
        const measuredInputs = document.querySelectorAll('.measured-input');
        const errorValuesCells = document.querySelectorAll('#error-values-row td:not(:first-child)');
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

// --- REGISTRO DEL SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(r => console.log('Service Worker registrado:', r))
      .catch(e => console.log('Fallo en registro de SW:', e));
  });
}
