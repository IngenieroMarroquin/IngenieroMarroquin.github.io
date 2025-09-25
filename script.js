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
        activationStep.style.display = 'block';
        activationStep.classList.add('active');
        mainAppSteps.forEach(step => step.style.display = 'none');
    }
}

// --- CONTENEDOR PRINCIPAL DE LA APLICACIÓN ---
function initializeMainApp() {
    
    // --- VARIABLES Y SELECTORES DEL DOM (ENCAPSULADOS) ---
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
    const protocolOtherInput = document.getElementById('protocolOther');
    const logoUploadContainer = document.getElementById('logo-upload-container');
    const logoInput = document.getElementById('logoInput');
    const logoPreviewContainer = document.getElementById('logo-preview-container');
    const logoPreview = document.getElementById('logo-preview');
    const removeLogoBtn = document.getElementById('removeLogoBtn');
    const pvUnitSelect = document.getElementById('pvUnit');
    const pvUnitOtherGroup = document.getElementById('pvUnitOtherGroup');
    const pvUnitOtherInput = document.getElementById('pvUnitOther');
    const customKeyboard = document.getElementById('custom-keyboard');

    // --- FUNCIONES INTERNAS (ENCAPSULADAS Y COMPLETAS) ---
    function sanitizeHTML(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
    
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

    function isValidNumber(value) {
        if (typeof value === 'string' && value.trim() === '') return false;
        if (value === '-' || value === '.') return false;
        const num = parseFloat(value);
        return !isNaN(num) && isFinite(num);
    }

    function validateFormStep(stepId) {
        let allValid = true;
        const requiredElements = formSteps[stepId].querySelectorAll('[required]');
        for (const el of requiredElements) {
            let value = '';
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                value = el.value;
            } else if (el.tagName === 'DIV') {
                value = el.textContent;
            }

            if (el.offsetParent !== null && value.trim() === '') {
                allValid = false;
                const label = document.querySelector(`label[for="${el.id}"]`) || document.querySelector(`label[for="${el.id}-wrapper"]`) || el.labels[0];
                showError(`El campo "${label.textContent}" es obligatorio.`);
                el.classList.add('active-input');
                setTimeout(() => el.classList.remove('active-input'), 2000);
                break;
            }
        }

        if (!allValid) return false;

        if (stepId === '1a') {
            const lrvInput = document.getElementById('lrv');
            const urvInput = document.getElementById('urv');
            if (!isValidNumber(getValue(lrvInput)) || !isValidNumber(getValue(urvInput))) {
                showError('Los valores LRV y URV deben ser números válidos.');
                return false;
            }
            if (parseFloat(getValue(lrvInput)) >= parseFloat(getValue(urvInput))) {
                showError('El Valor Mínimo (LRV) debe ser menor que el Valor Máximo (URV).');
                return false;
            }
        }
        if (stepId === '1b') {
            const permissibleErrorInput = document.getElementById('permissibleError');
            if (!isValidNumber(getValue(permissibleErrorInput)) || parseFloat(getValue(permissibleErrorInput)) <= 0) {
                showError('El Error Permisible debe ser un número positivo.');
                return false;
            }
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
            cell.textContent = parseFloat(errorInPv.toPrecision(6));
            cell.classList.remove('error-ok', 'error-fail');
            cell.classList.add(isWithinTolerance(data.errors_mA[i], calibrationState.errorThreshold_mA) ? 'error-ok' : 'error-fail');
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
        summaryEquationP.textContent = calibrationState.equation.formatted;
        summaryEquationP.classList.remove('hidden');
        updateChart();
    }

    function getChartConfig() {
        const { lrv, urv, pvUnit } = calibrationState.instrumentData;
        const measuredData = calibrationState.calibrationData.ideal.map((val, i) => ({
            x: val,
            y: calibrationState.calibrationData.measured_mA[i]
        }));
        return {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Comportamiento Ideal (4-20mA)',
                    data: [{x: lrv, y: 4}, {x: urv, y: 20}],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2, tension: 0.1, pointRadius: 0
                }, {
                    label: 'Comportamiento Medido',
                    data: measuredData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2, tension: 0.1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: { type: 'linear', title: { display: true, text: `Valor de Proceso (${pvUnit})`, color: '#333' }, ticks: { color: '#333' } },
                    y: { min: 0, max: 24, title: { display: true, text: 'Corriente (mA)', color: '#333' }, ticks: { color: '#333', stepSize: 4 } }
                },
                plugins: { 
                    legend: { labels: { color: '#333' } },
                    datalabels: {
                        color: '#c0392b', font: { weight: 'bold' },
                        formatter: (v, c) => c.datasetIndex === 1 ? v.y.toFixed(2) : null,
                        align: c => c.dataIndex === c.dataset.data.length - 1 ? 'left' : 'top',
                        anchor: 'end', offset: 4, display: 'auto'
                    }
                }
            }
        };
    }

    function updateChart() {
        if (calibrationState.chart) {
            calibrationState.chart.destroy();
            calibrationState.chart = null;
        }
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
        doc.autoTable({
            ...tableStyles, startY: finalY, theme: 'striped', margin: { left: 14, right: 14 },
            head: [['Parámetro', 'Valor']],
            body: [
                ['TAG', instrumentData.tag], ['Tipo de Instrumento', instrumentData.instrumentType],
                ['Marca', instrumentData.brand], ['Modelo', instrumentData.model],
                ['Nº de Serie', instrumentData.serialNumber], ['Alimentación', instrumentData.power], 
                ['Protocolo', instrumentData.protocol], ['Área de Trabajo', instrumentData.workArea],
                ['Rango', `${instrumentData.lrv} a ${instrumentData.urv} ${instrumentData.pvUnit}`],
            ].filter(row => row[1]),
        });
        finalY = doc.lastAutoTable.finalY + 6;
        
        doc.setFontSize(11);
        doc.text("2. Datos de la Prueba y Equipo Patrón", 14, finalY);
        finalY += 2;
        const testConditionMap = { 'As-Found': 'Tal como se encontró (As-Found)', 'As-Left': 'Tal como se dejó (As-Left)' };
        const conditionText = testConditionMap[instrumentData.testCondition] || instrumentData.testCondition;
        let section2Body = [
            ['Orden de Trabajo', instrumentData.workOrder], ['Lugar de la Prueba', instrumentData.testType],
            ['Condición', conditionText], ['Cliente', instrumentData.clientType],
            ['Error Permisible', `${instrumentData.permissibleError}% del Span`],
            ['Equipo Patrón', instrumentData.calibrator], ['Nº de Serie Patrón', instrumentData.calibratorSerialNumber],
            ['Última Calibración Patrón', instrumentData.calibratorLastCal ? new Date(instrumentData.calibratorLastCal + 'T00:00:00Z').toLocaleDateString('es-ES') : ''],
            ['Vencimiento Calibración Patrón', instrumentData.calibratorCalDue ? new Date(instrumentData.calibratorCalDue + 'T00:00:00Z').toLocaleDateString('es-ES') : ''],
        ];
        if (instrumentData.clientType === 'Externo') {
            section2Body.splice(4, 0, ['Nombre Cliente', instrumentData.clientName || 'N/A']);
        }
        
        doc.autoTable({ ...tableStyles, startY: finalY, body: section2Body.filter(row => row[1]), theme: 'striped', margin: { left: 14, right: 14 } });
        finalY = doc.lastAutoTable.finalY + 6; 
        
        doc.setFontSize(11);
        doc.text("3. Resultados de la Prueba de 5 Puntos", 14, finalY);
        finalY += 2;
        const tableBody = calibrationState.calibrationData.ideal.map((ideal, index) => [
            `${index * 25}%`, ideal.toFixed(2),
            calibrationState.calibrationData.measured[index].toFixed(2), calibrationState.calibrationData.ideal_mA[index].toFixed(2),
            calibrationState.calibrationData.measured_mA[index].toFixed(2), calibrationState.calibrationData.errors_mA[index].toFixed(2)
        ]);
        doc.autoTable({
            ...tableStyles, startY: finalY, theme: 'grid', margin: { left: 14, right: 14 },
            head: [['Punto', `Ideal (${instrumentData.pvUnit})`, `Medido (${instrumentData.pvUnit})`, 'Ideal (mA)', 'Medido (mA)', 'Error (mA)']],
            body: tableBody,
            didDrawCell: (data) => {
                if (data.column.index === 5 && data.cell.section === 'body') {
                    const errorInMA = calibrationState.calibrationData.errors_mA[data.row.index];
                    const isCellOk = isWithinTolerance(errorInMA, calibrationState.errorThreshold_mA);
                    doc.setFillColor(isCellOk ? 40 : 220, isCellOk ? 167 : 53, isCellOk ? 69 : 69);
                    doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.text(data.cell.text[0], data.cell.x + data.cell.padding('left'), data.cell.y + data.cell.height / 2, { baseline: 'middle' });
                }
            }
        });
        doc.setFontSize(8); doc.setTextColor(100);
        doc.text(footerText, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: "center" });
        doc.addPage();
        finalY = 15;

        doc.setFontSize(11); doc.text("4. Conclusión y Gráfico de Linealidad", 14, finalY);
        finalY += 6;
        doc.setFontSize(10); doc.setTextColor(isOk ? 40 : 220, isOk ? 167 : 53, isOk ? 69 : 69);
        doc.text(`Resultado General: ${isOk ? 'APROBADO' : 'RECHAZADO'}`, 14, finalY);
        doc.setTextColor(0, 0, 0); finalY += 8;
        
        const offscreenContainer = document.createElement('div');
        offscreenContainer.style.position = 'absolute'; offscreenContainer.style.left = '-9999px';
        offscreenContainer.style.width = '800px'; offscreenContainer.style.height = '450px';
        const offscreenCanvas = document.createElement('canvas');
        offscreenContainer.appendChild(offscreenCanvas);
        document.body.appendChild(offscreenContainer);
        const chartConfig = getChartConfig();
        chartConfig.options.animation = false;
        const tempChart = new Chart(offscreenCanvas.getContext('2d'), chartConfig);
        await new Promise(resolve => setTimeout(resolve, 200));
        const chartImage = tempChart.toBase64Image();
        tempChart.destroy();
        document.body.removeChild(offscreenContainer);
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
        let analysisText = isOk
            ? `Análisis de Resultados: La desviación máxima registrada durante la prueba se encuentra dentro de la tolerancia de ±${instrumentData.permissibleError}% del span configurado. El instrumento demuestra una respuesta lineal y una exactitud consistentes con las especificaciones del fabricante para su operación nominal.`
            : `Análisis de Resultados: Se ha identificado una desviación en uno o más puntos de la prueba que excede la tolerancia máxima permisible de ±${instrumentData.permissibleError}% del span. Se recomienda una intervención de ajuste (trimming) y una subsecuente verificación (As-Left) para restablecer la exactitud del instrumento a los parámetros operacionales requeridos.`;
        const splitText = doc.splitTextToSize(analysisText, textWidth);
        doc.text(splitText, margin, finalY); doc.setTextColor(0, 0, 0);

        const signatureY = pageHeight - 50;
        const signatureBody = [
            [
                '_________________________\n\n' + (instrumentData.technician || ''),
                '_________________________\n\n' + (instrumentData.workLead || ''),
                '_________________________\n\n' + (instrumentData.supervisor || '')
            ],
            [
                { content: 'TÉCNICO EJECUTANTE', styles: { fontStyle: 'bold' } },
                { content: 'RESPONSABLE DEL TRABAJO', styles: { fontStyle: 'bold' } },
                { content: 'SUPERVISOR DE OPERACIONES', styles: { fontStyle: 'bold' } }
            ]
        ];
        doc.autoTable({
            ...tableStyles, styles: { ...tableStyles.styles, halign: 'center' },
            startY: signatureY, theme: 'plain', margin: { left: 14, right: 14 },
            body: signatureBody
        });
        
        doc.setFontSize(8); doc.setTextColor(100);
        doc.text(footerText, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: "center" });
        doc.save(`Reporte_Calibracion_${instrumentData.tag}.pdf`);
        
        // --- INICIO: Bloque de código para Historial Offline ---
        try {
            const reportMetadata = {
                tag: instrumentData.tag,
                date: new Date().toISOString(),
                client: instrumentData.clientName || sessionState.executingCompany || 'Interno',
                result: isOk ? 'APROBADO' : 'RECHAZADO',
                pdfFileName: `Reporte_Calibracion_${instrumentData.tag}.pdf`
            };
            // Llamamos al gestor que ahora está disponible globalmente
            await window.dbManager.addReport(reportMetadata);
            console.log('Metadatos del reporte guardados en el historial offline.');
        } catch (error) {
            console.error('Error al guardar el reporte en el historial offline:', error);
        }
        // --- FIN: Bloque de código para Historial Offline ---
    }

    function softReset() {
        if (calibrationState.chart) {
            calibrationState.chart.destroy();
        }
        resetCalibrationState();
        const fieldsToReset = ['tag', 'instrumentType', 'brand', 'model', 'serialNumber', 'power', 'protocol', 'protocolOther', 'workArea', 'lrv', 'urv', 'pvUnit', 'pvUnitOther', 'workOrder', 'testType', 'testCondition', 'clientType', 'clientName', 'permissibleError', 'calibrator', 'calibratorSerialNumber', 'calibratorLastCal', 'calibratorCalDue', 'technician', 'workLead', 'supervisor'];
        fieldsToReset.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'SELECT') { el.selectedIndex = 0; }
                else if (el.tagName === 'INPUT') { el.value = ''; }
                else if (el.tagName === 'DIV') { el.textContent = ''; }
            }
        });
        document.getElementById('permissibleError').textContent = '1.0';
        document.getElementById('pvUnit').dispatchEvent(new Event('change'));
        document.getElementById('protocol').dispatchEvent(new Event('change'));
        document.getElementById('clientType').dispatchEvent(new Event('change'));
        measuredInputs.forEach(input => input.textContent = '');
        errorValuesCells.forEach(cell => { cell.textContent = '-'; cell.className = ''; });
        document.getElementById('error-values-row').classList.add('hidden');
        idealValuesCells.forEach(cell => cell.textContent = '-');
        navigateToFormStep('1a');
        navigateToAppStep('step1');
    }
    
    function showError(message) {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.classList.remove('hidden');
        }
    }
    
    function hideError() {
        if (errorMessageDiv) {
            errorMessageDiv.classList.add('hidden');
        }
    }
    
    function resetCalibrationState() {
        isValidated = false;
        calibrationState = {
            instrumentData: {},
            calibrationData: { ideal: [], measured: [], errors: [], ideal_mA: [], measured_mA: [], errors_mA: [] },
            span: 0,
            errorThreshold_mA: 0,
            chart: null,
            equation: { m: 0, b: 0, formatted: '' }
        };
    }
    
    // --- ASIGNACIÓN DE EVENT LISTENERS ---
    if(nextBtn1) nextBtn1.addEventListener('click', () => { if (validateFormStep('1a')) { hideError(); navigateToFormStep('1b'); } });
    if(backBtn1) backBtn1.addEventListener('click', () => navigateToFormStep('1a'));
    if(nextBtn2) nextBtn2.addEventListener('click', () => { if (validateFormStep('1b')) { hideError(); sessionState.executingCompany = sanitizeHTML(document.getElementById('executingCompany').value); navigateToFormStep('1c'); } });
    if(backBtn2) backBtn2.addEventListener('click', () => navigateToFormStep('1b'));
    if(backToStep1Btn) backToStep1Btn.addEventListener('click', () => navigateToAppStep('step1'));
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
            cell.textContent = '-'; cell.classList.remove('error-ok', 'error-fail');
        });
        document.getElementById('error-values-row').classList.add('hidden');
        hideError();
    });
    if(generatePdfBtn) generatePdfBtn.addEventListener('click', generatePDF);
    if(fullResetBtn) fullResetBtn.addEventListener('click', softReset);
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
    // --- Bloque de código del Teclado Restaurado y Corregido ---
    document.querySelectorAll('.numeric-input-field').forEach(field => {
        field.addEventListener('click', (e) => {
            document.querySelectorAll('.numeric-input-field.active-input').forEach(el => el.classList.remove('active-input'));
            activeNumericInput = e.currentTarget;
            activeNumericInput.classList.add('active-input');
            updateCursor();
            customKeyboard.classList.add('visible');
        });
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
                return; // ESTA ES LA CORRECCIÓN CRÍTICA
            case 'backspace': value = value.slice(0, -1); break;
            case '.': if (!value.includes('.')) value += '.'; break;
            case '-': if (value.length === 0) value += '-'; break;
            default: value += key; break;
        }
        activeNumericInput.innerHTML = '';
        activeNumericInput.textContent = value;
        updateCursor();
    });

    resetCalibrationState();
}

// --- PUNTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    const activateBtn = document.getElementById('activateBtn');
    if (activateBtn) activateBtn.addEventListener('click', handleActivation);
    checkLicenseAndInitialize();
});

// --- REGISTRO DEL SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(r => console.log('Service Worker registrado:', r))
      .catch(e => console.log('Fallo en registro de SW:', e));
  });
}
