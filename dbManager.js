// --- MÓDULO DE GESTIÓN DE BASE DE DATOS LOCAL (IndexedDB) ---
(function(window) {
    'use strict';
    const DB_NAME = 'SignalCheckPRO_History';
    const DB_VERSION = 1;
    const STORE_NAME = 'calibrationReports';
    let db;
    function initDB() {
        return new Promise((resolve, reject) => {
            if (db) { return resolve(db); }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const dbInstance = event.target.result;
                if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    objectStore.createIndex('tag', 'tag', { unique: false });
                    objectStore.createIndex('date', 'date', { unique: false });
                }
            };
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('Base de datos inicializada con éxito.');
                resolve(db);
            };
            request.onerror = (event) => {
                console.error('Error al inicializar la base de datos:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    const dbManager = {
        addReport: async function(reportData) {
            const dbInstance = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(reportData);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        },
        getAllReports: async function() {
            const dbInstance = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = dbInstance.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = (event) => {
                    const sortedResults = event.target.result.sort((a, b) => new Date(b.date) - new Date(a.date));
                    resolve(sortedResults);
                };
                request.onerror = (event) => reject(event.target.error);
            });
        },
        deleteReport: async function(reportId) {
            const dbInstance = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(reportId);
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        },
        clearAllReports: async function() {
            const dbInstance = await initDB();
            return new Promise((resolve, reject) => {
                const transaction = dbInstance.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        }
    };
    window.dbManager = dbManager;
    initDB();
})(window);
