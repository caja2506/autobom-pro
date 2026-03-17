const https = require('https');

console.log("Iniciando prueba de diagnóstico avanzado para generateInsights...");

const PROJECT_ID = "bom-ame-cr";
const REGION = "us-central1"; 
const URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/generateInsights`;

// Emulamos el prompt que envia 'buildAuditAnalysisPrompt' (simplificado para prueba)
const promptText = `Eres un consultor de gestión de ingeniería de automatización industrial.
Analiza los siguientes hallazgos de auditoría de un departamento de ingeniería y proporciona insights accionables.

Scores de cumplimiento:
  - Metodología: 100%
  - Planificación: 100%
  - Estimación: 75%
  - Disciplina: 70%
  - Salud de Proyectos: 100%

Contexto:
  - Tareas activas: 5
  - Tareas bloqueadas: 1

Hallazgos detectados (1 total, mostrando los más relevantes):
- [WARNING] Tarea sin asignar: "Actividad 3" no tiene responsable asignado.

Proporciona tu análisis en formato JSON estricto con esta estructura:
{
  "overallAssessment": "Evaluación general en 2-3 oraciones",
  "topRisks": [
    { "risk": "Descripción del riesgo", "impact": "alto|medio|bajo", "recommendation": "Acción recomendada" }
  ],
  "quickWins": [
    { "action": "Acción concreta para mejorar rápido", "expectedImpact": "Impacto esperado" }
  ],
  "weeklyFocus": "Área principal de enfoque para esta semana",
  "teamRecommendations": "Recomendaciones para el equipo"
}

Responde ÚNICAMENTE con el JSON.`;

const data = JSON.stringify({ data: { prompt: promptText, type: "audit_analysis" } });

const req = https.request(URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        console.log(`\n\n--- RESPONSE BODY ---`);
        console.log(responseBody);
        console.log(`---------------------\n\n`);
        
        try {
            const parsed = JSON.parse(responseBody);
            console.log("Resultado de JSON parse sobre la respuesta HTTP externa:", !!parsed);
            if(parsed.result && parsed.result.response) {
                console.log("\n--- TEXTO BRUTO DE GEMINI ---");
                console.log(parsed.result.response);
                console.log("-----------------------------\n");
            }
        } catch(e) {
            console.log("No se pudo parsear el JSON exterior devuelto por la Request HTTPS.");
        }
    });
});

req.on('error', (e) => {
    console.error(`ERROR en la petición: ${e.message}`);
});

req.write(data);
req.end();
