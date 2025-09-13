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
async function generateFingerprint() { /* Código sin cambios, se omite por brevedad */ }
async function handleActivation() { /* Código sin cambios, se omite por brevedad */ }
function showActivationError(message) { /* Código sin cambios, se omite por brevedad */ }
function hideActivationError() { /* Código sin cambios, se omite por brevedad */ }

// --- ESTRUCTURA DE ARRANQUE DE LA APLICACIÓN ---
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

function checkLicenseAndInitialize() {
    const licenseStatus = localStorage.getItem(LICENSE_STORAGE_KEY);
    const activationStep = document.getElementById('step-0-activation');
    const mainAppSteps = document.querySelectorAll('#step-1-datasheet, #step-2-calibration, #step-3-report');

    if (licenseStatus === 'VALID') {
        activationStep.style.display = 'none';
        mainAppSteps.forEach(step => step.style.display = '');
        document.getElementById('step-1-datasheet').classList.add('active');
        initializeMainApp(); // <-- INICIALIZACIÓN DEFINITIVA
    } else {
        activationStep.classList.add('active');
        mainAppSteps.forEach(step => step.style.display = 'none');
    }
}

// --- CONTENEDOR PRINCIPAL DE LA APLICACIÓN ---
function initializeMainApp() {
    
    // --- VARIABLES Y SELECTORES DEL DOM (AHORA LOCALES) ---
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
    const errorMessageDiv = document.getElementById('error-message');
    const idealValuesCells = document.querySelectorAll('#ideal-values-row td:not(:first-child)');
    const measuredInputs = document.querySelectorAll('.measured-input');
    const errorValuesCells = document.querySelectorAll('#error-values-row td:not(:first-child)');
    const idealUnitSpan = document.getElementById('ideal-unit');
    const measuredUnitSpan = document.getElementById('measured-unit');
    const summaryEquationP = document.getElementById('summary-equation');
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

    // --- FUNCIONES INTERNAS (ENCAPSULADAS) ---
    function sanitizeHTML(str) { /* ... Tu código original ... */ }
    function navigateToAppStep(stepName) {
        Object.values(steps).forEach(step => step.classList.remove('active'));
        steps[stepName].classList.add('active');
        window.scrollTo(0, 0);
    }
    function navigateToFormStep(formStepName) {
        Object.values(formSteps).forEach(step => step.classList.remove('active'));
        formSteps[formStepName].classList.add('active');
    }
    function getValue(element) { return element.textContent; }
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
    function softReset() { /* ... Tu código original ... */ }
    function showError(message) { /* ... Tu código original ... */ }
    function hideError() { /* ... Tu código original ... */ }
    function resetCalibrationState() { /* ... Tu código original ... */ }

    // --- ASIGNACIÓN DE EVENT LISTENERS (GARANTIZADO) ---
    if(nextBtn1) nextBtn1.addEventListener('click', () => { if (validateFormStep('1a')) { hideError(); navigateToFormStep('1b'); } });
    // ... Todos los demás listeners originales ...
    
    resetCalibrationState(); // Se llama al final para asegurar que todo está listo.
}
