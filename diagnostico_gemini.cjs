const https = require('https');

console.log("Iniciando prueba de diagnóstico para testGeminiConnection...");

// El region por defecto en Firebase suele ser us-central1 si no se especifica.
const PROJECT_ID = "bom-ame-cr";
const REGION = "us-central1"; // o el region que use el proyecto
const URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/testGeminiConnection`;

const data = JSON.stringify({ data: {} });

const req = https.request(URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        console.log(`RESPONSE BODY: ${responseBody}`);
        try {
            const parsed = JSON.parse(responseBody);
            console.log("Resultado Parseado:", parsed);
        } catch(e) {
            console.log("No se pudo parsear como JSON.");
        }
    });
});

req.on('error', (e) => {
    console.error(`ERROR en la petición: ${e.message}`);
});

req.write(data);
req.end();
