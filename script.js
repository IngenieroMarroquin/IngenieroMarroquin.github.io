"use strict";

// --- CONSTANTES DE CONFIGURACIÓN ---
const API_URL = 'https://signalcheck-pro-api.vercel.app/verify-license';
const LICENSE_STORAGE_KEY = 'signalcheck_pro_license_status';

// --- INICIALIZACIÓN DE LIBRERÍAS ---
const { jsPDF } = window.jspdf;
Chart.register(ChartDataLabels);

// --- ESTADO DE LA APLICACIÓN ---
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
            
            // --- INICIO DE LA CIRUGÍA UX ---
            // 1. Transformar el botón en un botón de ingreso exitoso.
            activateBtn.textContent = 'Ingresa a SignalCheck PRO';
            activateBtn.style.backgroundColor = 'var(--export-button-bg)'; // Color verde de éxito
            activateBtn.style.borderColor = 'var(--export-button-hover)';
            
            // 2. Reasignar el evento del botón para que ahora recargue la página.
            // Se usa 'replaceWith' y 'cloneNode' para eliminar limpiamente el listener anterior.
            const newButton = activateBtn.cloneNode(true);
            activateBtn.parentNode.replaceChild(newButton, activateBtn);
            newButton.addEventListener('click', () => {
                window.location.reload();
            });

            // 3. Habilitar el nuevo botón para que el usuario pueda hacer clic.
            newButton.disabled = false;
            // --- FIN DE LA CIRUGÍA UX ---

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

function checkLicense() {
    const licenseStatus = localStorage.getItem(LICENSE_STORAGE_KEY);
    const activationStep = document.getElementById('step-0-activation');
    const mainAppSteps = document.querySelectorAll('#step-1-datasheet, #step-2-calibration, #step-3-report');
    
    if (licenseStatus === 'VALID') {
        if (activationStep) {
            activationStep.style.display = 'none';
            activationStep.classList.remove('active');
        }
        mainAppSteps.forEach(step => {
            if(step) step.style.display = ''; // Limpiamos el display:none
        });
        document.getElementById('step-1-datasheet').classList.add('active');
    } else {
        if (activationStep) activationStep.classList.add('active');
        mainAppSteps.forEach(step => {
            if (step) {
                step.style.display = 'none';
                step.classList.remove('active');
            }
        });
    }
}

// --- CÓDIGO FUNCIONAL DE LA APLICACIÓN (SIN CAMBIOS) ---
// El resto del código de la aplicación permanece idéntico.
// Se omite por brevedad, pero debe estar completo en tu archivo.
function resetCalibrationState() { /* ... código original ... */ }
function sanitizeHTML(str) { /* ... código original ... */ }
// ... (Copiar y pegar todo el código original de la app desde la declaración de 'steps' hasta el final de 'hideError')

// --- PUNTO DE ENTRADA DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) activateBtn.addEventListener('click', handleActivation);
    
    if (localStorage.getItem(LICENSE_STORAGE_KEY) === 'VALID') {
        initializeMainApp();
    }
    
    checkLicense();
});

function initializeMainApp() {
    // Código de inicialización
}

// ... (Pega aquí el resto de tus funciones originales)
