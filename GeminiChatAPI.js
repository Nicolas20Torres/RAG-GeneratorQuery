/**
 * @class GeminiChatAPI
 * @description Clase para gestionar el contexto de la conversación, definir herramientas y realizar llamadas a la API de Gemini,
 * con persistencia del historial de mensajes y herramientas utilizando Google Apps Script's PropertiesService.
 */
class GeminiChatAPI {

    /**
     * Constructor de la clase GeminiChatAPI.
     * @param {string} modelName - El nombre del modelo de Gemini a utilizar (ej. "gemini-1.5-flash", "gemini-1.5-pro").
     * @param {string} apiKey - Tu clave API de Gemini.
     * @param {string} [initialSystemMessage] - Un mensaje inicial de "system" (como "parts" en Gemini) para establecer el comportamiento del asistente.
     * @param {string} [apiEndpoint="https://generativelanguage.googleapis.com/v1beta/models/"] - La URL base del endpoint de la API. El modelo se añadirá a esto.
     * @param {GoogleAppsScript.Properties.Properties} [propertiesServiceInstance] - Instancia opcional de PropertiesService. Por defecto, usa UserProperties.
     */
    constructor(
      modelName, 
      apiKey, 
      initialSystemMessage = null, 
      apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/", 
      propertiesServiceInstance = null
    ) {
        if (!modelName) {
            throw new Error("El nombre del modelo de Gemini es requerido.");
        }
        if (!apiKey) {
            throw new Error("La clave API de Gemini es requerida.");
        }

        this.model = modelName;
        this.apiKey = apiKey;
        // El apiEndpoint ahora es la base, el modelo y la acción se añadirán después
        this.apiEndpoint = apiEndpoint; 
        this.propertiesService = propertiesServiceInstance || PropertiesService.getUserProperties();
        // Cambiamos la clave para reflejar que es para Gemini
        this._CONTEXT_PROPERTY_KEY = 'GEMINI_CHAT_CONTEXT';

        this.messages = [];
        this.tools = [];

        // Cargar el estado del contexto persistido
        this._loadContext();

        // Gemini no tiene un rol "system" explícito en `contents` como Mistral.
        // Los mensajes de sistema se manejan mejor como el primer mensaje del rol "user" o
        // como parte de la configuración `generationConfig` o `safetySettings`
        // o, si es un mensaje de comportamiento, como parte del primer mensaje "user" en el prompt.
        // Para mantener la modularidad, lo añadiremos como el primer mensaje del rol "user" si el historial está vacío.
        // Podrías considerar pasarlo como un ajuste en `generationConfig` si Gemini lo soportara así para System.
        if (this.messages.length === 0 && initialSystemMessage) {
            // Ajustamos a la estructura de Gemini: un mensaje con rol 'user'
            // y el mensaje del sistema como su 'text'
            this.addMessage("user", initialSystemMessage);
            this._saveContext(); 
        }

        Logger.log(`GeminiChatAPI inicializada para el modelo: ${this.model}`);
    }

    /**
     * Carga el historial de mensajes y herramientas desde PropertiesService.
     * @private
     */
    _loadContext() {
        try {
            const storedContext = this.propertiesService.getProperty(this._CONTEXT_PROPERTY_KEY);
            if (storedContext) {
                const parsedContext = JSON.parse(storedContext);
                this.messages = parsedContext.messages || [];
                this.tools = parsedContext.tools || [];
                Logger.log("Contexto cargado desde PropertiesService.");
            } else {
                this.messages = [];
                this.tools = [];
                Logger.log("No se encontró contexto persistido. Iniciando con contexto vacío.");
            }
        } catch (e) {
            Logger.log(`Error al cargar contexto: ${e.message}. Iniciando con contexto vacío.`);
            this.messages = [];
            this.tools = [];
        }
    }

    /**
     * Guarda el historial de mensajes y herramientas en PropertiesService.
     * @private
     */
    _saveContext() {
        try {
            const contextToStore = {
                messages: this.messages,
                tools: this.tools 
            };
            const stringifiedContext = JSON.stringify(contextToStore);
            this.propertiesService.setProperty(this._CONTEXT_PROPERTY_KEY, stringifiedContext);
            Logger.log("Contexto guardado en PropertiesService.");
        } catch (e) {
            Logger.log(`Error al guardar contexto: ${e.message}. Contexto no persistido.`);
        }
    }

    /**
     * Añade un mensaje al historial de conversación y lo guarda.
     * @param {string} role - El rol del emisor ('user' o 'model').
     * @param {string|Object} content - El contenido del mensaje (texto o un objeto de llamada a herramienta/respuesta).
     */
    addMessage(role, content) {
        // Transformar el contenido al formato de 'parts' de Gemini
        let parts = [];

        if (role === 'user') {
            // Esta parte se mantiene igual para los mensajes de texto del usuario.
            if (typeof content === 'string') {
                parts.push({ text: content });
            } else {
                Logger.warning(`Contenido de usuario inesperado: ${JSON.stringify(content)}`);
                parts.push({ text: JSON.stringify(content) }); // fallback
            }

        } else if (role === 'model') {
            // Esta parte se mantiene igual para las respuestas y sugerencias del modelo.
            if (typeof content === 'string') {
                parts.push({ text: content });
            } else if (content.tool_calls && Array.isArray(content.tool_calls)) {
                content.tool_calls.forEach(call => {
                    parts.push({
                        functionCall: {
                            name: call.function.name,
                            args: call.function.arguments
                        }
                    });
                });
            } else {
                Logger.warning(`Contenido de modelo inesperado: ${JSON.stringify(content)}`);
                parts.push({ text: JSON.stringify(content) }); // fallback
            }

        /* ========================= INICIO DEL CAMBIO ========================= */
        
        } else if (role === 'tool') {
            // ✨ NUEVO BLOQUE: Aquí manejamos específicamente la respuesta de la herramienta.
            // 'content' que llega aquí es el objeto que creamos en la función principal:
            // { functionResponse: { name: 'getFilteredData', response: '...' } }

            if (content.functionResponse && content.functionResponse.name) {
                parts.push({
                    functionResponse: {
                        name: content.functionResponse.name,
                        // La API espera que la respuesta sea un objeto, por lo que la anidamos.
                        // Tu `contentForGemini` ya contiene el texto formateado.
                        response: {
                          content: content.functionResponse.response
                        }
                    }
                });
            } else {
                // Fallback si el contenido de la herramienta no tiene el formato esperado.
                Logger.warning(`Contenido de herramienta con formato incorrecto: ${JSON.stringify(content)}`);
            }

        /* ========================== FIN DEL CAMBIO ========================== */

        } else {
            // Este bloque ahora solo se activará si llega un rol verdaderamente inesperado.
            Logger.warning(`Rol desconocido: "${role}". Usando "user" por defecto para Gemini.`);
            role = 'user';
            parts.push({ text: typeof content === 'string' ? content : JSON.stringify(content) });
        }

        this.messages.push({ role: role, parts: parts });
        this._saveContext();
    }

    /**
     * Establece un nuevo array de mensajes, sobrescribiendo el historial existente y persistiendo.
     * @param {Array<Object>} newMessages - Un array de objetos de mensaje en formato de Gemini (con `role` y `parts`).
     */
    setMessages(newMessages) {
        if (!Array.isArray(newMessages)) {
            throw new Error("El contexto debe ser un array de mensajes.");
        }
        // Validación básica de la estructura de mensajes para Gemini
        newMessages.forEach(msg => {
            if (!msg.role || !msg.parts || !Array.isArray(msg.parts)) {
                throw new Error("Cada mensaje debe tener un 'role' y un array 'parts'.");
            }
        });
        this.messages = newMessages;
        this._saveContext();
        Logger.log("Historial de mensajes sobrescrito y guardado.");
    }

    /**
     * Obtiene el historial actual de mensajes.
     * @returns {Array<Object>} Una copia del array de mensajes.
     */
    getMessages() {
        return [...this.messages];
    }

    /**
     * Limpia el historial de mensajes y lo elimina de PropertiesService.
     */
    clearMessages() {
        this.messages = [];
        this.propertiesService.deleteProperty(this._CONTEXT_PROPERTY_KEY);
        Logger.log("Historial de mensajes limpiado y eliminado de PropertiesService.");
    }

    /**
     * Establece las herramientas disponibles para el modelo y las persiste.
     * @param {Array<Object>} newTools - Un array de objetos de herramientas en el formato de Gemini.
     * Ej: `[{ functionDeclaration: { name: 'myFunction', parameters: { ... } } }]`
     */
    setTools(newTools) {
        if (!Array.isArray(newTools)) {
            throw new Error("Las herramientas deben ser un array.");
        }
        // Opcional: Podrías añadir validación para la estructura de las herramientas de Gemini aquí.
        this.tools = newTools;
        this._saveContext();
        Logger.log("Herramientas establecidas y guardadas.");
    }

    /**
     * Agrega una sola herramienta a la lista existente y las persiste.
     * @param {Object} toolObject - El objeto de la herramienta a agregar en formato de Gemini.
     * Ej: `{ functionDeclaration: { name: 'myFunction', parameters: { ... } } }`
     */
    addTool(toolObject) {
        // Validación básica para el formato de herramienta de Gemini
        if (typeof toolObject !== 'object' || toolObject === null || !toolObject.functionDeclaration || !toolObject.functionDeclaration.name) {
            throw new Error("El objeto de la herramienta debe ser un objeto válido con 'functionDeclaration' y 'functionDeclaration.name'.");
        }
        this.tools.push(toolObject);
        this._saveContext();
        Logger.log(`Herramienta '${toolObject.functionDeclaration.name}' añadida y guardada.`);
    }

    /**
     * Limpia la lista de herramientas y las elimina de PropertiesService (indirectamente, al guardar sin ellas).
     */
    clearTools() {
        this.tools = [];
        this._saveContext(); 
        Logger.log("Herramientas limpiadas y el cambio guardado.");
    }

    /**
     * Genera el payload completo en formato JSON para enviar a la API de Gemini.
     * @param {Object} [options={}] - Opciones adicionales para el payload (ej. `generationConfig`, `safetySettings`).
     * @returns {string} El payload JSON como una cadena de texto.
     */

    _buildPayload(options = {}) {
        // Inicializa el payload con los contenidos del chat
        const payload = {
            contents: this.messages
        };

        // Añadir generationConfig si existe en las opciones pasadas
        if (options.generationConfig) {
            payload.generationConfig = options.generationConfig;
        } else {
            // Aseguramos un valor por defecto si no se pasa uno, para evitar errores de API
            payload.generationConfig = { temperature: 0.1 }; 
        }

        // Añadir safetySettings si existe en las opciones pasadas
        if (options.safetySettings) {
            payload.safetySettings = options.safetySettings;
        }

        // --- ¡¡¡ESTA ES LA PARTE CRÍTICA PARA LAS HERRAMIENTAS!!! ---
        // Añadir la DECLARACIÓN de las herramientas al payload.
        // Asumimos que `this.tools` ya es el objeto { "functionDeclarations": [...] }
        // si lo guardaste así en setTools, o la estructura que la API espera.
        // Si tu `setTools` guardó un array de herramientas, por ejemplo:
        // `setTools(newTools)` donde `newTools` es `[{ functionDeclarations: [...] }]`
        // entonces deberías accederlo como `this.tools[0]`.
        
        // **Ajusta esta lógica según la estructura EXACTA de `this.tools`**
        if (this.tools && this.tools.functionDeclarations && Array.isArray(this.tools.functionDeclarations) && this.tools.functionDeclarations.length > 0) {
            payload.tools = this.tools; // Si this.tools ya es { "functionDeclarations": [...] }
            Logger.log("DEBUG: Herramientas añadidas al payload.");
        } else if (this.tools && Array.isArray(this.tools) && this.tools.length > 0 && this.tools[0].functionDeclarations) {
            // Esto cubre el caso si `this.tools` es un array como `[{ functionDeclarations: [...] }]`
            payload.tools = this.tools[0];
            Logger.log("DEBUG: Herramientas añadidas al payload (formato array).");
        }
        else {
            Logger.log("ADVERTENCIA CRÍTICA: Las definiciones de herramientas (payload.tools) no se pudieron añadir correctamente. Formato de this.tools: " + JSON.stringify(this.tools));
        }
        // --- FIN DE LA PARTE CRÍTICA PARA LAS HERRAMIENTAS ---


        // --- ¡¡¡ESTA ES LA PARTE CRÍTICA PARA FORZAR LAS LLAMADAS A HERRAMIENTAS!!! ---
        // Añadir la CONFIGURACIÓN DE HERRAMIENTAS (toolConfig) al payload.
        // Esto es lo que fuerza al modelo a generar functionCalls.
        if (options.toolConfig) {
            payload.toolConfig = options.toolConfig;
            Logger.log("DEBUG: toolConfig añadido al payload.");
        } else {

            Logger.log("ADVERTENCIA CRÍTICA: toolConfig no está presente en las opciones para el payload. No se forzará el uso de herramientas.");
        }
        // --- FIN DE LA PARTE CRÍTICA PARA FORZAR LAS LLAMADAS A HERRAMIENTAS ---
        
        return JSON.stringify(payload);
    }

  /**
   * Envía la solicitud de chat a la API de Gemini y devuelve la respuesta.
   * Incluye los mensajes y herramientas actuales de la instancia.
   * @param {Object} [apiOptions={}] - Opciones adicionales para el payload de la API (ej. `temperature`, `safetySettings`).
   * 'temperature' se anidará en 'generationConfig'.
   * @returns {Object|null} El objeto de respuesta JSON de la API de Gemini, o null si hay un error.
   */
  sendMessage(apiOptions = {}) {
      const fullApiUrl = `${this.apiEndpoint}${this.model}:generateContent?key=${this.apiKey}`;

      // Creamos un objeto para contener TODAS las opciones que irán al payload.
      // Esto asegura que generationConfig y safetySettings estén en el lugar correcto.
      const payloadOptions = {};

      // 1. Manejar generationConfig (incluyendo temperature)
      if (apiOptions.temperature !== undefined) {
          payloadOptions.generationConfig = {
              temperature: apiOptions.temperature
          };
      } else {
          // Asegúrate de que siempre haya un generationConfig si se pasan otras propiedades
          // O si quieres un default temperature cuando no se especifica.
          // Por ejemplo, si apiOptions.temperature no existe, puedes definir un default:
          payloadOptions.generationConfig = {
              temperature: 0.1 // Default si no se pasa uno
          };
      }

      if (apiOptions.tool_config !== undefined) {
          payloadOptions.toolConfig = apiOptions.tool_config;
      }    

      // Aquí puedes añadir otros parámetros de generationConfig si los necesitas,
      // por ejemplo:
      // if (apiOptions.maxOutputTokens !== undefined) {
      //     payloadOptions.generationConfig.maxOutputTokens = apiOptions.maxOutputTokens;
      // }


      // 2. Manejar safetySettings si existen
      if (apiOptions.safetySettings !== undefined) {
          payloadOptions.safetySettings = apiOptions.safetySettings;
      }

      // 3. Pasar el objeto payloadOptions ya estructurado a _buildPayload
      const requestPayload = this._buildPayload(payloadOptions);

      Logger.log("Payload enviado a la API:\n" + JSON.stringify(JSON.parse(requestPayload), null, 2));

      try {
          const options = {
              method: "post",
              contentType: "application/json",
              payload: requestPayload,
              muteHttpExceptions: true
          };

          Logger.log(`Enviando solicitud a la API de Gemini: ${fullApiUrl}`);
          const response = UrlFetchApp.fetch(fullApiUrl, options);
          const responseCode = response.getResponseCode();
          const responseBody = response.getContentText();

          if (responseCode >= 200 && responseCode < 300) {
              const jsonResponse = JSON.parse(responseBody);
              Logger.log("Respuesta de la API recibida.");
              return jsonResponse;
          } else {
              Logger.log(`Error de la API: Código ${responseCode}, Mensaje: ${responseBody}`);
              return null;
          }
      } catch (e) {
          Logger.log("Excepción al llamar a la API: " + e.toString());
          return null;
      }
  }
}
