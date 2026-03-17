import { parseGeminiResponse } from './src/core/ai/insightGenerator.js';

console.log("=== Probando parseGeminiResponse con Objeto ===");
try {
    const rawObject = { overallAssessment: "Test" };
    const parsed = parseGeminiResponse(rawObject);
    console.log("Éxito! Parseo:", !!parsed);
} catch (e) {
    console.error("Falló el parseo con error:", e);
}
