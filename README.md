## 👨‍💻 Sobre mí  

Hola, soy **Nicolás Torres**, apasionado por el mundo de los **datos, la automatización y la inteligencia artificial aplicada a los negocios**.  

Actualmente trabajo como **Business Intelligence / Data Engineer**, donde utilizo principalmente:  
- 🐍 **Python** para análisis, automatización y modelado.  
- 📊 **Power BI** para la creación de tableros y visualizaciones interactivas.  
- 🗄️ **SQL** para la gestión, modelado y optimización de bases de datos.  
- ⚙️ Herramientas de automatización como **AppSheet** y **Power Automate**, enfocadas en optimizar procesos empresariales.  
- 🛡️ Experiencia en **gobernanza de datos**, asegurando calidad, integridad y seguridad de la información.  

### 🚀 Mi aspiración profesional  
Convertirme en un **programador avanzado en Inteligencia Artificial**, capaz de:  
- Integrar modelos y herramientas inteligentes.  
- Simplificar procesos complejos mediante IA.  
- Impulsar a las compañías hacia el **éxito empresarial basado en datos**.  

Me considero un **aprendiz constante**, siempre explorando nuevas tecnologías y enfoques.  
Las **analogías y ejemplos prácticos** son mis aliados para comprender y explicar cómo la programación puede transformar los datos en valor real.  

📌 Este repositorio es parte de mi camino para **compartir, aprender y crear soluciones en el mundo de la IA aplicada a datos**.  
Es una iniciativa abierta para **desarrollar y colaborar con otras personas y organizaciones** interesadas en potenciar sus capacidades con datos e inteligencia artificial.  

-------------------------------------------------------------------------

📌 **GeminiChatAPI**

Clase en Google Apps Script para gestionar conversaciones con la API de
Gemini de Google.
Permite manejar el historial de mensajes, configurar herramientas,
establecer contexto persistente y enviar prompts a los modelos
gemini-1.5-flash o gemini-1.5-pro.

------------------------------------------------------------------------

🚀 Características principales

-   📂 Persistencia automática de mensajes y herramientas usando
    PropertiesService.
-   💬 Gestión de contexto conversacional (user, model, tool).
-   🛠️ Integración de herramientas mediante functionDeclaration y
    functionResponse.
-   ⚙️ Configuración flexible con generationConfig, safetySettings y
    toolConfig.
-   🔑 Compatible con Google Apps Script y la API REST de Gemini.

------------------------------------------------------------------------

📦 Instalación

Copia la clase GeminiChatAPI en tu proyecto de Google Apps Script.
No se necesitan dependencias externas.

------------------------------------------------------------------------

🔑 Requisitos

-   Una clave API de Gemini obtenida desde Google AI Studio.
-   Activar el servicio de URL Fetch en tu script (UrlFetchApp).
-   Acceso a PropertiesService para la persistencia.

------------------------------------------------------------------------

🛠️ Uso básico

    // Inicializar la clase
    const chat = new GeminiChatAPI(
      "gemini-1.5-flash",          // Modelo
      "TU_API_KEY",                // Clave API
      "Eres un asistente útil."    // Mensaje inicial de sistema
    );

    // Añadir un mensaje del usuario
    chat.addMessage("user", "Hola, ¿puedes darme un resumen de qué es Gemini?");

    // Enviar a la API
    const respuesta = chat.sendMessage({ temperature: 0.2 });
    Logger.log(JSON.stringify(respuesta, null, 2));

------------------------------------------------------------------------

📂 Gestión del contexto

La clase almacena automáticamente los mensajes en PropertiesService para
mantener la memoria entre ejecuciones.

✅ Métodos disponibles:

-   addMessage(role, content) → Agrega un mensaje (user, model, tool).
-   getMessages() → Devuelve el historial actual.
-   setMessages(newMessages) → Sobrescribe todo el historial.
-   clearMessages() → Limpia la memoria del chat.

Ejemplo:

    chat.clearMessages();
    chat.addMessage("user", "Explica qué es el machine learning.");

------------------------------------------------------------------------

🛠️ Manejo de herramientas (Functions)

Puedes registrar funciones que Gemini puede llamar durante la
conversación.

    chat.setTools({
      functionDeclarations: [
        {
          name: "getWeather",
          description: "Obtiene el clima actual de una ciudad.",
          parameters: {
            type: "object",
            properties: {
              city: { type: "string" }
            },
            required: ["city"]
          }
        }
      ]
    });

Agregar de forma incremental:

    chat.addTool({
      functionDeclaration: {
        name: "getStockPrice",
        description: "Devuelve el precio de una acción.",
        parameters: {
          type: "object",
          properties: { ticker: { type: "string" } },
          required: ["ticker"]
        }
      }
    });

Limpiar todas las herramientas:

    chat.clearTools();

------------------------------------------------------------------------

⚙️ Opciones avanzadas en sendMessage

Puedes controlar la configuración de generación y seguridad:

    const response = chat.sendMessage({
      temperature: 0.7,
      safetySettings: [
        { category: "HARM_CATEGORY_DEROGATORY", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ],
      tool_config: { functionCallingConfig: "AUTO" } // Forzar llamadas a herramientas
    });

------------------------------------------------------------------------

📌 Buenas prácticas

1.  Persistencia de contexto: Usa clearMessages() antes de iniciar una
    nueva conversación para evitar mezclas.
2.  Manejo de errores: Verifica siempre si sendMessage() retorna null
    (puede fallar la API).
3.  Seguridad: No expongas tu apiKey en el código, usa PropertiesService
    para guardarla.
4.  Uso de herramientas: Define parámetros claros en functionDeclaration
    para evitar malinterpretaciones.
5.  Logs: Aprovecha Logger.log() para depurar payloads y respuestas.

------------------------------------------------------------------------

📖 Ejemplo completo

    function ejemploGemini() {
      const chat = new GeminiChatAPI("gemini-1.5-pro", PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY"));

      // Limpiar contexto previo
      chat.clearMessages();

      // Definir herramienta
      chat.setTools({
        functionDeclarations: [
          {
            name: "getDate",
            description: "Devuelve la fecha actual",
            parameters: { type: "object", properties: {} }
          }
        ]
      });

      // Añadir mensaje inicial
      chat.addMessage("user", "¿Qué día es hoy?");

      // Enviar prompt
      const respuesta = chat.sendMessage({ temperature: 0.1, tool_config: { functionCallingConfig: "AUTO" } });

      Logger.log(JSON.stringify(respuesta, null, 2));
    }

------------------------------------------------------------------------

📜 Licencia

Este código se distribuye bajo licencia MIT.
Puedes modificarlo y adaptarlo libremente en tus proyectos.

