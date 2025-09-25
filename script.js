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
    if (!licenseKey) { showActivationError('Por favor, introduce una clave de licencia.'); return; }
    activateBtn.classList.add('loading');
    activateBtn.disabled = true;
    hideActivationError();
    try {
        const fingerprint = await generateFingerprint();
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ licenseKey, fingerprint }) });
        const data = await response.json();
        if (response.ok && data.success) {
            localStorage.setItem(LICENSE_STORAGE_KEY, 'VALID');
            window.location.reload();
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
    if (activationErrorDiv) { activationErrorDiv.textContent = message; activationErrorDiv.classList.remove('hidden'); }
}

function hideActivationError() {
    const activationErrorDiv = document.getElementById('activation-error-message');
    if (activationErrorDiv) { activationErrorDiv.classList.add('hidden'); }
}

function checkLicenseAndInitialize() {
    const licenseStatus = localStorage.getItem(LICENSE_STORAGE_KEY);
    const activationStep = document.getElementById('step-0-activation');
    const appSections = document.querySelectorAll('.app-step:not(#step-0-activation)');

    if (licenseStatus === 'VALID') {
        activationStep.style.display = 'none';
        appSections.forEach(step => step.style.display = 'block'); // Muestra todas las secciones de la app
        
        // Asegura que solo el panel de control esté activo
        document.querySelectorAll('.app-step').forEach(s => s.classList.remove('active'));
        document.getElementById('step-home').classList.add('active');

        initializeMainApp();
    } else {
        // Muestra solo la activación y oculta todo lo demás
        activationStep.style.display = 'block';
        activationStep.classList.add('active');
        appSections.forEach(step => step.style.display = 'none');
    }
}

// --- CONTENEDOR PRINCIPAL DE LA APLICACIÓN ---
async function initializeMainApp() {
    
    // --- SELECTORES DEL DOM ---
    const steps = {
        home: document.getElementById('step-home'),
        step1: document.getElementById('step-1-datasheet'),
        step2: document.getElementById('step-2-calibration'),
        step3: document.getElementById('step-3-report'),
        history: document.getElementById('step-4-history'),
    };
    const formSteps = {
        '1a': document.getElementById('form-step-1a'),
        '1b': document.getElementById('form-step-1b'),
        '1c': document.getElementById('form-step-1c')
    };
    
    // Selectores de Navegación
    const goToAppBtn = document.getElementById('goToAppBtn');
    const goToHistoryBtn = document.getElementById('goToHistoryBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    
    const instrumentForm = document.getElementById('instrumentForm');
    const nextBtn1 = document.getElementById('nextBtn1');
    const nextBtn2 = document.getElementById('nextBtn2');
    const backBtn1 = document.getElementById('backBtn1');
    const backBtn2 = document.getElementById('backBtn2');
    const backToStep1Btn = document.getElementById('backToStep1Btn');
    const validateBtn = document.getElementById('validateBtn');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const fullResetBtn = document.getElementById('fullResetBtn');
    const customKeyboard = document.getElementById('custom-keyboard');
    
    // Selectores del Historial
    const historyListContainer = document.getElementById('history-list-container');
    const searchTagInput = document.getElementById('searchTag');
    const searchDateInput = document.getElementById('searchDate');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const deleteAllHistoryBtn = document.getElementById('deleteAllHistoryBtn');
    
    // --- LÓGICA DE NAVEGACIÓN ---
    function navigateToAppStep(stepName) {
        Object.values(steps).forEach(step => step.classList.remove('active'));
        if(steps[stepName]) {
            steps[stepName].classList.add('active');
        }
        window.scrollTo(0, 0);
    }
    
    // --- LÓGICA DEL PANEL DE CONTROL ---
    async function updateDashboardSummary() {
        const summaryP = document.getElementById('history-summary');
        const historyBtn = document.getElementById('goToHistoryBtn');
        if (!summaryP || !historyBtn) return;

        try {
            const reports = await window.dbManager.getAllReports();
            const count = reports.length;

            if (count === 0) {
                summaryP.textContent = "No hay reportes guardados.";
                historyBtn.disabled = true;
            } else if (count === 1) {
                summaryP.textContent = "Hay 1 reporte guardado.";
                historyBtn.disabled = false;
            } else {
                summaryP.textContent = `Hay ${count} reportes guardados.`;
                historyBtn.disabled = false;
            }
        } catch (error) {
            console.error("Error al actualizar el resumen del panel:", error);
            summaryP.textContent = "No se pudo acceder al historial.";
            historyBtn.disabled = true;
        }
    }

    // Lógica del historial y renderizado
    async function renderHistory(reports) {
        historyListContainer.innerHTML = ''; // Limpiar lista
        if (!reports || reports.length === 0) {
            historyListContainer.innerHTML = `<p class="empty-history-message">No hay reportes que coincidan con su búsqueda.</p>`;
            return;
        }

        reports.forEach(report => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-item-info">
                    <span class="history-item-tag">${sanitizeHTML(report.tag)}</span>
                    <span class="history-item-date">${new Date(report.date).toLocaleString()}</span>
                </div>
                <div class="history-item-actions">
                    <button data-id="${report.id}" class="btn-delete-report">🗑️</button>
                </div>
            `;
            historyListContainer.appendChild(item);
        });
    }

    async function loadAndRenderHistory() {
        const allReports = await window.dbManager.getAllReports();
        renderHistory(allReports);
    }
    
    // ... Resto de funciones internas (sin cambios)...

    // --- ASIGNACIÓN DE EVENT LISTENERS ---
    goToAppBtn.addEventListener('click', () => {
        softReset(); // Resetea el estado para una nueva calibración
        navigateToAppStep('step1');
    });
    
    goToHistoryBtn.addEventListener('click', () => {
        loadAndRenderHistory();
        navigateToAppStep('history');
    });
    
    backToHomeBtn.addEventListener('click', () => {
        updateDashboardSummary(); // Actualiza el conteo al volver
        navigateToAppStep('home');
    });

    clearSearchBtn.addEventListener('click', () => {
        searchTagInput.value = '';
        searchDateInput.value = '';
        loadAndRenderHistory();
    });

    deleteAllHistoryBtn.addEventListener('click', async () => {
        if (confirm('¿Está seguro de que desea borrar TODO el historial? Esta acción no se puede deshacer.')) {
            await window.dbManager.clearAllReports();
            await loadAndRenderHistory();
        }
    });
    
    instrumentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // ... Lógica de submit sin cambios ...
        prepareCalibrationStep();
        navigateToAppStep('step2');
    });
    
    // ... Resto de event listeners sin cambios ...
    
    // Llamada inicial para poblar el panel
    updateDashboardSummary();
}


// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) activateBtn.addEventListener('click', handleActivation);
    checkLicenseAndInitialize();
});

// --- SISTEMA DE REGISTRO Y ACTUALIZACIÓN DEL SERVICE WORKER ---
function registerSW() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('Service Worker registrado:', registration);
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        const updateNotification = document.getElementById('update-notification');
                        const updateBtn = document.getElementById('update-btn');
                        updateNotification.classList.remove('hidden');
                        updateBtn.addEventListener('click', () => { newWorker.postMessage({ type: 'SKIP_WAITING' }); });
                    }
                });
            });
        }).catch(error => { console.log('Fallo en registro de SW:', error); });
        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => { if (!refreshing) { window.location.reload(); refreshing = true; } });
    }
}
registerSW();
