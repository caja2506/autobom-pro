const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

// Secret managed via: firebase functions:secrets:set GEMINI_API_KEY
const geminiApiKey = defineSecret("GEMINI_API_KEY");

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Cloud Function: testGeminiConnection
 * Simple ping to verify the Gemini API is reachable.
 */
exports.testGeminiConnection = onCall(
    { secrets: [geminiApiKey] },
    async (request) => {
        const apiKey = geminiApiKey.value();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: 'Responde únicamente con la palabra: CONECTADO' },
                            ],
                        },
                    ],
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new HttpsError(
                    "internal",
                    data.error?.message || `HTTP error ${response.status}`
                );
            }

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return { status: "ok", response: text };
        } catch (err) {
            if (err instanceof HttpsError) throw err;
            throw new HttpsError("internal", err.message);
        }
    }
);

/**
 * Cloud Function: analyzeQuotePdf
 * Receives extracted PDF text from the client, sends it to Gemini
 * with a structured prompt, and returns the parsed JSON result.
 */
exports.analyzeQuotePdf = onCall(
    { secrets: [geminiApiKey], timeoutSeconds: 120 },
    async (request) => {
        const { text } = request.data;

        if (!text || typeof text !== "string" || !text.trim()) {
            throw new HttpsError(
                "invalid-argument",
                "Se requiere el texto extraído del PDF."
            );
        }

        const apiKey = geminiApiKey.value();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

        const prompt = `Analiza el texto de una cotización. Extrae los datos y devuelve EXCLUSIVAMENTE un JSON estricto con la siguiente estructura: { "supplier": "Nombre Proveedor", "items": [ { "pn": "Número de parte", "description": "Descripción", "quantity": numero, "unitPrice": numero, "leadTimeWeeks": numero } ] }.
Reglas:
1. Ignora texto irrelevante, encabezados o textos legales.
2. Los pn (Part Number) deben estar en MAYÚSCULAS y resolverse sin espacios.
3. description debe ser concisa, técnica y resumida.
4. quantity y unitPrice deben ser numéricos (usa 0 si falta el dato).
5. Si no hay proveedor, usa "".
6. leadTimeWeeks es el tiempo de entrega en SEMANAS. Si dice días, convierte dividiendo entre 7 y redondeando hacia arriba (mínimo 1). Si no se menciona, usa null.
7. Busca frases como "lead time", "tiempo de entrega", "delivery", "plazo", "semanas", "weeks", "días", "days".
Devuelve SOLO el JSON sin delimitadores markdown.

Texto:

${text}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { response_mime_type: "application/json" },
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new HttpsError(
                    "internal",
                    `Error de IA: ${result.error?.message || "Fallo desconocido"}`
                );
            }

            const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawJson) {
                throw new HttpsError("internal", "La IA no devolvió ningún texto.");
            }

            // Parse and validate the JSON
            const parsed = JSON.parse(
                rawJson
                    .replace(/```json/g, "")
                    .replace(/```/g, "")
                    .trim()
            );

            return { data: parsed };
        } catch (err) {
            if (err instanceof HttpsError) throw err;
            if (err instanceof SyntaxError) {
                throw new HttpsError(
                    "internal",
                    "La IA devolvió JSON inválido. Intenta de nuevo."
                );
            }
            throw new HttpsError("internal", err.message);
        }
    }
);
