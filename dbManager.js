// --- MÓDULO DE GESTIÓN DE BASE DE DATOS LOCAL (IndexedDB) ---

const DB_NAME = 'SignalCheckPRO_History';
const DB_VERSION = 1;
const STORE_NAME = 'calibrationReports';
let db;

/**
 * Inicializa y abre la conexión con la base de datos IndexedDB.
 * Crea el almacén de objetos si no existe.
 * @returns {Promise<void>}
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                // Creamos índices para poder buscar eficientemente por TAG y fecha
                objectStore.createIndex('tag', 'tag', { unique: false });
                objectStore.createIndex('date', 'date', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Base de datos inicializada con éxito.');
            resolve();
        };

        request.onerror = (event) => {
            console.error('Error al inicializar la base de datos:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Agrega un nuevo registro de reporte a la base de datos.
 * @param {object} reportData - El objeto con los metadatos del reporte.
 * @returns {Promise<number>} El ID del nuevo registro.
 */
export async function addReport(reportData) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(reportData);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Obtiene todos los reportes almacenados, ordenados por fecha descendente.
 * @returns {Promise<object[]>} Un array con todos los reportes.
 */
export async function getAllReports() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('date'); // Usamos el índice de fecha para ordenar
        const request = index.getAll(null, 'prev'); // 'prev' para orden descendente (más nuevos primero)

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Borra un reporte específico de la base de datos usando su ID.
 * @param {number} reportId - El ID del reporte a borrar.
 * @returns {Promise<void>}
 */
export async function deleteReport(reportId) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(reportId);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Borra todos los reportes de la base de datos.
 * @returns {Promise<void>}
 */
export async function clearAllReports() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Inicializamos la base de datos tan pronto como el módulo se carga.
initDB().catch(console.error);
