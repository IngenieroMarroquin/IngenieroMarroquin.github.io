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

// --- DECLARACIÓN DE FUNCIONES ORIGINALES DE LA APP ---

function navigateToAppStep(stepName, steps) {
    Object.values(steps).forEach(step => { if(step) step.classList.remove('active'); });
    if(steps[stepName]) steps[stepName].classList.add('active');
    window.scrollTo(0, 0);
}

function navigateToFormStep(formStepName, formSteps) {
    Object.values(formSteps).forEach(step => { if(step) step.classList.remove('active'); });
    if(formSteps[formStepName]) formSteps[formStepName].classList.add('active');
}

function getValue(element) { return element.textContent; }

function isValidNumber(value) {
    if (typeof value === 'string' && value.trim() === '') return false;
    if (value === '-' || value === '.') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
}

function validateFormStep(stepId, formSteps) {
    let allValid = true;
    const container = formSteps[stepId];
    if (!container) return false;
    const requiredElements = container.querySelectorAll('[required]');
    for (const el of requiredElements) {
        let value = '';
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT') { value = el.value; }
        else if (el.tagName === 'DIV') { value = el.textContent; }
        if (el.offsetParent !== null && value.trim() === '') {
             allValid = false;
             const label = document.querySelector(`label[for="${el.id}-wrapper"]`) || (el.labels ? el.labels[0] : null);
             showError(`El campo "${label ? label.textContent : el.id}" es obligatorio.`);
             el.classList.add('active-input'); 
             setTimeout(() => el.classList.remove('active-input'), 2000);
             break;
        }
    }
    if (!allValid) return false;
    if (stepId === '1a') {
        const lrvInput = document.getElementById('lrv');
        const urvInput = document.getElementById('urv');
        if (!isValidNumber(getValue(lrvInput)) || !isValidNumber(getValue(urvInput))) { showError('Los valores LRV y URV deben ser números válidos.'); return false; }
        if (parseFloat(getValue(lrvInput)) >= parseFloat(getValue(urvInput))) { showError('El Valor Mínimo (LRV) debe ser menor que el Valor Máximo (URV).'); return false; }
    }
    if (stepId === '1b') {
        const permissibleErrorInput = document.getElementById('permissibleError');
        if (!isValidNumber(getValue(permissibleErrorInput)) || parseFloat(getValue(permissibleErrorInput)) <= 0) { showError('El Error Permisible debe ser un número positivo.'); return false; }
    }
    return true;
}

function updateCursor() {
    if (cursorSpan) {
        cursorSpan.remove();
        cursorSpan = null;
    }
    if (activeNumericInput) {
        cursorSpan = document.createElement('span');
        cursorSpan.className = 'cursor';
        activeNumericInput.appendChild(cursorSpan);
    }
}

function calculateEquation() {
    const { lrv, urv } = calibrationState.instrumentData;
    calibrationState.span = urv - lrv;
    const m = 16 / calibrationState.span;
    const b = 4 - (m * lrv);
    calibrationState.equation = { m, b, formatted: `Corriente (mA) = ${m.toFixed(4)} * PV ${b >= 0 ? '+' : '-'} ${Math.abs(b).toFixed(4)}` };
}

function prepareCalibrationStep() {
    const idealValuesCells = document.querySelectorAll('#ideal-values-row td:not(:first-child)');
    const idealUnitSpan = document.getElementById('ideal-unit');
    const measuredUnitSpan = document.getElementById('measured-unit');
    const validateBtn = document.getElementById('validateBtn');
    const resetMeasurementBtn = document.getElementById('resetMeasurementBtn');
    const backToStep1Btn = document.getElementById('backToStep1Btn');

    isValidated = false;
    validateBtn.textContent = 'Validar';
    resetMeasurementBtn.disabled = false;
    backToStep1Btn.disabled = false;

    const { lrv, urv, pvUnit, permissibleError } = calibrationState.instrumentData;
    calibrationState.span = urv - lrv;
    calibrationState.errorThreshold_mA = 16 * (permissibleError / 100);
    calculateEquation();
    const increment = calibrationState.span / 4;
    calibrationState.calibrationData.ideal = [ lrv, lrv + increment, lrv + (2 * increment), lrv + (3 * increment), urv ];
    idealValuesCells.forEach((cell, index) => {
        cell.textContent = parseFloat(calibrationState.calibrationData.ideal[index].toPrecision(6));
    });
    idealUnitSpan.textContent = pvUnit;
    measuredUnitSpan.textContent = pvUnit;
}

function validateMeasuredInputs() {
    const measuredInputs = document.querySelectorAll('.measured-input');
    for (const input of measuredInputs) {
        if (!isValidNumber(getValue(input))) {
            showError('Por favor, ingrese valores medidos numéricos y válidos.');
            return false;
        }
    }
    hideError();
    return true;
}

function isWithinTolerance(error, tolerance) {
    const epsilon = 1e-9;
    return Math.abs(error) <= (tolerance + epsilon);
}

function calculateAndDisplayErrors() {
    const measuredInputs = document.querySelectorAll('.measured-input');
    const errorValuesCells = document.querySelectorAll('#error-values-row td:not(:first-child)');
    const data = calibrationState.calibrationData;
    const equation = calibrationState.equation;
    data.measured = Array.from(measuredInputs).map(input => parseFloat(getValue(input)));
    data.errors = data.ideal.map((ideal, i) => data.measured[i] - ideal);
    data.ideal_mA = [4, 8, 12, 16, 20];
    data.measured_mA = data.measured.map(pv => (equation.m * pv) + equation.b);
    data.errors_mA = data.ideal_mA.map((ideal, i) => data.measured_mA[i] - ideal);
    document.getElementById('error-values-row').classList.remove('hidden');
    errorValuesCells.forEach((cell, i) => {
        const errorInPv = data.errors[i];
        const errorInMA = data.errors_mA[i];
        cell.textContent = parseFloat(errorInPv.toPrecision(6));
        cell.classList.remove('error-ok', 'error-fail');
        cell.classList.add(isWithinTolerance(errorInMA, calibrationState.errorThreshold_mA) ? 'error-ok' : 'error-fail');
    });
}

function prepareReportStep() {
    const { tag } = calibrationState.instrumentData;
    const isOk = calibrationState.calibrationData.errors_mA.every(e => isWithinTolerance(e, calibrationState.errorThreshold_mA));
    document.getElementById('summary-tag').textContent = tag;
    document.getElementById('summary-date').textContent = new Date().toLocaleString('es-ES');
    const resultSpan = document.getElementById('summary-result');
    resultSpan.textContent = isOk ? 'APROBADO (Dentro de Tolerancia)' : 'RECHAZADO (Fuera de Tolerancia)';
    resultSpan.className = isOk ? 'error-ok' : 'error-fail';
    document.getElementById('summary-equation').textContent = calibrationState.equation.formatted;
    document.getElementById('summary-equation').classList.remove('hidden');
    updateChart();
}

function getChartConfig() {
    const { lrv, urv, pvUnit } = calibrationState.instrumentData;
    const measuredData = calibrationState.calibrationData.ideal.map((val, i) => ({ x: val, y: calibrationState.calibrationData.measured_mA[i] }));
    return { type: 'line', data: { datasets: [{ label: 'Comportamiento Ideal (4-20mA)', data: [{x: lrv, y: 4}, {x: urv, y: 20}], borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 2, tension: 0.1, pointRadius: 0 }, { label: 'Comportamiento Medido', data: measuredData, borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 2, tension: 0.1, }] }, options: { responsive: true, maintainAspectRatio: true, scales: { x: { type: 'linear', title: { display: true, text: `Valor de Proceso (${pvUnit})`, color: '#333' }, ticks: { color: '#333' } }, y: { min: 0, max: 24, title: { display: true, text: 'Corriente (mA)', color: '#333' }, ticks: { color: '#333', stepSize: 4 } } }, plugins: { legend: { labels: { color: '#333' } }, datalabels: { color: '#c0392b', font: { weight: 'bold' }, formatter: (v, c) => c.datasetIndex === 1 ? v.y.toFixed(2) : null, align: c => c.dataIndex === c.dataset.data.length - 1 ? 'left' : 'top', anchor: 'end', offset: 4, display: 'auto' } } } };
}

function updateChart() {
    if (calibrationState.chart) { calibrationState.chart.destroy(); calibrationState.chart = null; }
    const ctx = document.getElementById('chart').getContext('2d');
    calibrationState.chart = new Chart(ctx, getChartConfig());
}

async function generatePDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const { instrumentData, calibrationData, equation } = calibrationState;
    const isOk = calibrationState.calibrationData.errors_mA.every(e => isWithinTolerance(e, calibrationState.errorThreshold_mA));
    let finalY = 10;
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerText = "La validez de este reporte está sujeta a las condiciones del instrumento al momento de la prueba.";
    const tableStyles = { styles: { fontSize: 9 }, headStyles: { fontSize: 9, fontStyle: 'bold', fillColor: [42, 56, 76] } };
    if (sessionState.companyLogo) {
        try {
            const imgProps = doc.getImageProperties(sessionState.companyLogo);
            const logoHeight = 12;
            const logoWidth = (imgProps.width * logoHeight) / imgProps.height;
            doc.addImage(sessionState.companyLogo, 'PNG', 14, finalY + 1.5, logoWidth, logoHeight);
        } catch (e) { console.error("Error al agregar el logo al PDF:", e); }
    }
    doc.setFontSize(18);
    doc.text("Reporte de Calibración de Instrumento", doc.internal.pageSize.getWidth() / 2, finalY + 7.5, { align: "center", baseline: 'middle' });
    finalY += 14;
    if (sessionState.executingCompany) {
        doc.setFontSize(10); doc.setTextColor(100);
        doc.text(`Ejecutado por: ${sessionState.executingCompany}`, doc.internal.pageSize.getWidth() / 2, finalY, { align: "center" });
        doc.setTextColor(0); finalY += 5;
    }
    doc.setFontSize(8);
    doc.text(`Fecha: ${new Date().toLocaleString('es-ES')}`, doc.internal.pageSize.getWidth() / 2, finalY, { align: "center" });
    finalY += 8;
    doc.setFontSize(11);
    doc.text("1. Datos del Instrumento", 14, finalY);
    finalY += 2;
    doc.autoTable({ ...tableStyles, startY: finalY, theme: 'striped', margin: { left: 14, right: 14 }, head: [['Parámetro', 'Valor']], body: [['TAG', instrumentData.tag], ['Tipo de Instrumento', instrumentData.instrumentType], ['Marca', instrumentData.brand], ['Modelo', instrumentData.model], ['Nº de Serie', instrumentData.serialNumber], ['Alimentación', instrumentData.power],  ['Protocolo', instrumentData.protocol], ['Área de Trabajo', instrumentData.workArea], ['Rango', `${instrumentData.lrv} a ${instrumentData.urv} ${instrumentData.pvUnit}`]].filter(row => row[1]) });
    finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(11);
    doc.text("2. Datos de la Prueba y Equipo Patrón", 14, finalY);
    finalY += 2;
    const testConditionMap = { 'As-Found': 'Tal como se encontró (As-Found)', 'As-Left': 'Tal como se dejó (As-Left)' };
    const conditionText = testConditionMap[instrumentData.testCondition] || instrumentData.testCondition;
    let section2Body = [['Orden de Trabajo', instrumentData.workOrder], ['Lugar de la Prueba', instrumentData.testType], ['Condición', conditionText], ['Cliente', instrumentData.clientType], ['Error Permisible', `${instrumentData.permissibleError}% del Span`], ['Equipo Patrón', instrumentData.calibrator], ['Nº de Serie Patrón', instrumentData.calibratorSerialNumber], ['Última Calibración Patrón', instrumentData.calibratorLastCal ? new Date(instrumentData.calibratorLastCal + 'T00:00:00Z').toLocaleDateString('es-ES') : ''], ['Vencimiento Calibración Patrón', instrumentData.calibratorCalDue ? new Date(instrumentData.calibratorCalDue + 'T00:00:00Z').toLocaleDateString('es-ES') : '']];
    if (instrumentData.clientType === 'Externo') { section2Body.splice(4, 0, ['Nombre Cliente', instrumentData.clientName || 'N/A']); }
    doc.autoTable({ ...tableStyles, startY: finalY, body: section2Body.filter(row => row[1]), theme: 'striped', margin: { left: 14, right: 14 } });
    finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(11);
    doc.text("3. Resultados de la Prueba de 5 Puntos", 14, finalY);
    finalY += 2;
    const tableBody = calibrationData.ideal.map((ideal, index) => [`${index * 25}%`, ideal.toFixed(2), calibrationData.measured[index].toFixed(2), calibrationData.ideal_mA[index].toFixed(2), calibrationData.measured_mA[index].toFixed(2), calibrationData.errors_mA[index].toFixed(2)]);
    doc.autoTable({ ...tableStyles, startY: finalY, theme: 'grid', margin: { left: 14, right: 14 }, head: [['Punto', `Ideal (${instrumentData.pvUnit})`, `Medido (${instrumentData.pvUnit})`, 'Ideal (mA)', 'Medido (mA)', 'Error (mA)']], body: tableBody, didDrawCell: (data) => { if (data.column.index === 5 && data.cell.section === 'body') { const errorInMA = calibrationData.errors_mA[data.row.index]; const isCellOk = isWithinTolerance(errorInMA, calibrationState.errorThreshold_mA); doc.setFillColor(isCellOk ? 40 : 220, isCellOk ? 167 : 53, isCellOk ? 69 : 69); doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F'); doc.setTextColor(255, 255, 255); doc.text(data.cell.text[0], data.cell.x + data.cell.padding('left'), data.cell.y + data.cell.height / 2, { baseline: 'middle' }); } } });
    doc.setFontSize(8); doc.setTextColor(100); doc.text(footerText, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: "center" });
    doc.addPage();
    finalY = 15;
    doc.setFontSize(11); doc.text("4. Conclusión y Gráfico de Linealidad", 14, finalY);
    finalY += 6;
    doc.setFontSize(10); doc.setTextColor(isOk ? 40 : 220, isOk ? 167 : 53, isOk ? 69 : 69);
    doc.text(`Resultado General: ${isOk ? 'APROBADO' : 'RECHAZADO'}`, 14, finalY);
    doc.setTextColor(0, 0, 0); finalY += 8;
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.style.width = '800px';
    offscreenCanvas.style.height = '450px';
    const chartConfig = getChartConfig();
    chartConfig.options.animation = false;
    const tempChart = new Chart(offscreenCanvas.getContext('2d'), chartConfig);
    await new Promise(resolve => setTimeout(resolve, 300));
    const chartImage = tempChart.toBase64Image();
    tempChart.destroy();
    const pageWidth = doc.internal.pageSize.getWidth();
    const chartWidth = pageWidth - 28;
    const chartHeight = (chartWidth * 450) / 800;
    doc.addImage(chartImage, 'PNG', 14, finalY, chartWidth, chartHeight);
    finalY += chartHeight + 8;
    doc.setFont('courier', 'bold'); doc.setFontSize(9);
    doc.text(equation.formatted, doc.internal.pageSize.getWidth() / 2, finalY, { align: "center" });
    doc.setFont('helvetica', 'normal'); finalY += 8;
    doc.setFontSize(9); doc.setTextColor(80);
    const margin = 14; const textWidth = doc.internal.pageSize.getWidth() - (margin * 2);
    let analysisText = isOk ? `Análisis de Resultados: La desviación máxima registrada...` : `Análisis de Resultados: Se ha identificado una desviación...`;
    const splitText = doc.splitTextToSize(analysisText, textWidth);
    doc.text(splitText, margin, finalY); doc.setTextColor(0, 0, 0);
    const signatureY = pageHeight - 50;
    const signatureBody = [ [ '_________________________\n\n' + (instrumentData.technician || ''), '_________________________\n\n' + (instrumentData.workLead || ''), '_________________________\n\n' + (instrumentData.supervisor || '') ], [ { content: 'TÉCNICO EJECUTANTE', styles: { fontStyle: 'bold' } }, { content: 'RESPONSABLE DEL TRABAJO', styles: { fontStyle: 'bold' } }, { content: 'SUPERVISOR DE OPERACIONES', styles: { fontStyle: 'bold' } } ] ];
    doc.autoTable({ ...tableStyles, styles: { ...tableStyles.styles, halign: 'center' }, startY: signatureY, theme: 'plain', margin: { left: 14, right: 14 }, body: signatureBody });
    doc.setFontSize(8); doc.setTextColor(100);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: "center" });
    doc.save(`Reporte_Calibracion_${instrumentData.tag}.pdf`);
}

function showError(message) {
    const errorMessageDiv = document.getElementById('error-message');
    if(errorMessageDiv) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.remove('hidden');
    }
}

function hideError() {
    const errorMessageDiv = document.getElementById('error-message');
    if(errorMessageDiv) {
        errorMessageDiv.classList.add('hidden');
    }
}

// --- REGISTRO DEL SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(r => console.log('Service Worker registrado:', r))
      .catch(e => console.log('Fallo en registro de SW:', e));
  });
}
