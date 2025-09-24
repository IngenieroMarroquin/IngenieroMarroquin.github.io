// --- MÓDULO DE GESTIÓN DE BASE DE DATOS LOCAL (IndexedDB) ---
// Adaptado para un entorno de script global (no-modular)

(function(window) {
    'use strict';

    const DB_NAME = 'SignalCheckPRO_History';
    const DB_VERSION = 1;
    const STORE_NAME = 'calibrationReports';
    let db;

    function initDB() {
        return new Promise((resolve, reject) => {
            if (db) {
                return resolve();
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
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

    const dbManager = {
        addReport: async function(reportData) {
            await initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.add(reportData);
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        },
        getAllReports: async function() {
            await initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const index = store.index('date');
                const request = index.getAll(null, 'prev');
                request.onsuccess = (event) => resolve(event.target.result);
                request.onerror = (event) => reject(event.target.error);
            });
        },
        deleteReport: async function(reportId) {
            await initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(reportId);
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        },
        clearAllReports: async function() {
            await initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        }
    };

    // Adjuntamos el gestor al objeto global 'window' para que sea accesible desde script.js
    window.dbManager = dbManager;

})(window);
