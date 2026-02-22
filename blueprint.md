# AutoBOM Pro Blueprint

## 1. Visión General

AutoBOM Pro es una aplicación de gestión de "Bill of Materials" (BOM) diseñada para ingenieros y equipos de desarrollo de hardware. Permite crear y gestionar proyectos, mantener un catálogo maestro de componentes y generar listas de materiales de forma manual o automática a través de la importación de PDFs asistida por IA.

## 2. Arquitectura y Diseño

*   **Frontend:** React (Vite) con componentes funcionales y Hooks.
*   **Base de Datos:** Cloud Firestore para persistencia de datos en tiempo real.
*   **Estilos:** Tailwind CSS para un diseño moderno y responsivo.
*   **Componentes:** Utiliza la librería de iconos `lucide-react`.
*   **Inteligencia Artificial:** Integración con la API de Google Gemini (`gemini-1.5-flash`) para el procesamiento de documentos PDF.

### Flujo de Datos de IA

1.  **Carga de PDF:** El usuario carga un archivo PDF (cotización, lista de partes) a través de la interfaz.
2.  **Extracción de Texto:** La librería `pdf.js` se utiliza para extraer el contenido de texto plano del documento.
3.  **Prompt a Gemini:** Se envía un `prompt` estructurado a la API de Gemini, solicitando la extracción de ítems en un formato JSON específico. El prompt incluye reglas estrictas:
    *   Ignorar texto irrelevante (encabezados, legales).
    *   Normalizar campos: limpiar P/N, resumir descripciones, convertir precios a formato decimal.
    *   Devolver `""` o `0` para campos faltantes.
4.  **Revisión en Cliente:** Antes de escribir en la base de datos, la aplicación:
    *   Carga los P/N del `catalogo_maestro` en el estado de React.
    *   Compara cada P/N extraído por la IA con la lista en memoria.
5.  **Escritura en Firestore:**
    *   **Pieza Nueva:** Si el P/N no existe, se crea un nuevo documento en `catalogo_maestro`.
    *   **Pieza Existente:** Si el P/N existe, se actualiza el `lastPrice` si es necesario.
    *   **Vinculación:** Se crea un nuevo documento en `items_bom` que referencia la pieza en el catálogo y la asocia al proyecto actual con su cantidad y precio.

### Colecciones de Firestore

*   `proyectos_bom`: Almacena la información principal de cada proyecto (nombre, descripción, fecha).
*   `catalogo_maestro`: La base de datos centralizada de todas las piezas únicas.
*   `items_bom`: La lista de materiales de cada proyecto, vinculando piezas del catálogo a un proyecto.
*   `marcas`, `categorias`, `proveedores`: Listas gestionables para etiquetar y organizar las piezas.

## 3. Plan de Implementación Actual

**Solicitud:** Corregir y detallar la lógica de IA y datos según las especificaciones técnicas.

**Estado:** La funcionalidad de importación de PDF fue restaurada. Ahora se está refinando el prompt enviado a la IA para mejorar la precisión y la resiliencia de los datos, y para asegurar la consistencia con las reglas de negocio de la aplicación.

**Pasos:**

1.  **[COMPLETADO]** Leer el archivo `src/App.jsx` para analizar la implementación actual.
2.  **[COMPLETADO]** Crear el archivo `blueprint.md` para documentar la arquitectura del proyecto.
3.  **[ACTUAL]** Modificar la función `handlePdfUpload` en `src/App.jsx` para actualizar el `prompt` de la IA con reglas más estrictas, incluyendo el manejo de valores nulos, la normalización de campos y el resumen de descripciones.
4.  **[PENDIENTE]** Validar que la aplicación funcione correctamente después de la actualización del prompt.
