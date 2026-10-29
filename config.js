// Configuracion de produccion. El servidor de desarrollo (npm run dev)
// sirve otra version de este archivo que apunta a la API local.
//   apiBase:   API de licencias.
//   publicKey: clave PUBLICA ECDSA P-256 con la que la app verifica el token
//              sin conexion. Solo sirve para verificar; la privada vive en Vercel.
window.SCP_CONFIG = {
    apiBase: 'https://signalcheck-pro-api.vercel.app',
    publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEm2dx16iEMrK6PPQV6oanAJC17+UFY6DvgkBLKKN+Avru+mpwOf9SWm4LZqUWBqQkqJ1Beb3JCGPQbx4gRCLyJg=='
};
