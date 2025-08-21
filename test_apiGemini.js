/**
 * 🚀 Orquestación de flujo con Gemini usando ToolExecutor y nuevas herramientas (V2).
 * Basado en la estructura previa, pero adaptado a las nuevas funciones.
 */

/**
 * INSERTAR LAS HERRAMIENTAS DEL SISTEMA AQUI (V2)
 * Se insertan las herramientas dentro de la clase globalToolExecutor
 * para que Gemini pueda invocarlas cuando lo requiera.
 */
const globalToolExecutor = new ToolExecutor();

// Registrar funciones reales de implementación
globalToolExecutor.registerTool("getCurrentDate", () => {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
});

globalToolExecutor.registerTool("calculateBMI", ({ weight, height }) => {
  if (!weight || !height) throw new Error("Se requieren peso y altura.");
  const bmi = weight / (height * height);
  return { bmi: bmi.toFixed(2), status: bmi < 25 ? "Normal" : "Sobrepeso" };
});

globalToolExecutor.registerTool("getExchangeRate", ({ fromCurrency, toCurrency }) => {
  // ⚠️ Este ejemplo es fijo, en producción deberías conectar a una API de tipo de cambio
  const dummyRates = {
    "USD_EUR": 0.92,
    "EUR_USD": 1.08,
    "USD_MXN": 16.8
  };
  const key = `${fromCurrency}_${toCurrency}`;
  if (!dummyRates[key]) throw new Error(`No se encuentra tipo de cambio para ${fromCurrency} → ${toCurrency}`);
  return { rate: dummyRates[key], from: fromCurrency, to: toCurrency };
});

/**
 * Orquestador principal que integra Gemini con herramientas V2.
 * @param {string} promptTexto - El mensaje del usuario.
 * @returns {string} Respuesta del asistente.
 */
function testGeminiChatAPIWithToolsFlowV2(promptTexto) {
  // --- Configuración Inicial ---
  const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!API_KEY) {
    Logger.log("❌ Error: Falta la API Key de Gemini en PropertiesService.");
    return "Error de configuración: Clave API no encontrada.";
  }

  const myToolsSchema = toolFunctionsV2(); // NUEVA versión con getCurrentDate, calculateBMI, getExchangeRate

  // Instancia de Gemini con contexto inicial
  const geminiClient = new GeminiChatAPI("gemini-2.5-flash", API_KEY, asistamContext());
  geminiClient.setTools(myToolsSchema);

  // Guardar prompt del usuario
  geminiClient.addMessage("user", promptTexto);
  Logger.log("📩 Prompt recibido: " + promptTexto);

  // --- 1. Primera llamada a Gemini ---
  let apiResponse = geminiClient.sendMessage({ tool_config: miToolConfig, temperature: 0.1 });

  if (!apiResponse?.candidates?.length) {
    Logger.log("❌ No hubo respuesta de Gemini.");
    return "No se recibió respuesta del modelo.";
  }

  const firstCandidate = apiResponse.candidates[0];
  const modelParts = firstCandidate.content?.parts || [];

  // Extraer llamadas a funciones y texto
  const functionCallsFromModel = modelParts.filter(part => part.functionCall);
  const textResponseFromModel = modelParts.filter(part => part.text).map(p => p.text).join('');

  // --- 2. Procesar llamadas a herramientas ---
  if (functionCallsFromModel.length > 0) {
    Logger.log("🛠️ Gemini sugirió llamadas a herramientas.");

    geminiClient.addMessage("model", { tool_calls: functionCallsFromModel.map(fc => ({ function: fc.functionCall })) });

    for (const fcPart of functionCallsFromModel) {
      const functionCall = fcPart.functionCall;

      try {
        const toolOutput = globalToolExecutor.executeToolCall(functionCall);
        Logger.log(`✅ Herramienta ejecutada: ${functionCall.name} → ${JSON.stringify(toolOutput)}`);

        // Añadir resultado al historial
        geminiClient.addMessage("tool", {
          functionResponse: {
            name: functionCall.name,
            response: toolOutput
          }
        });

      } catch (e) {
        Logger.log(`❌ Error en herramienta ${functionCall.name}: ${e.message}`);
        geminiClient.addMessage("tool", {
          functionResponse: {
            name: functionCall.name,
            response: { error: e.message }
          }
        });
      }
    }

    // --- 3. Segunda llamada a Gemini con los resultados de herramientas ---
    apiResponse = geminiClient.sendMessage({ tool_config: miToolConfig, temperature: 0.2 });

    if (apiResponse?.candidates?.[0]?.content?.parts?.some(p => p.text)) {
      const finalContent = apiResponse.candidates[0].content.parts.filter(p => p.text).map(p => p.text).join('');
      Logger.log("💬 Respuesta final con herramientas:\n" + finalContent);
      return finalContent;
    } else {
      return "El modelo no generó una respuesta final después de usar las herramientas.";
    }
  }

  // --- 4. Si solo hubo texto ---
  if (textResponseFromModel) {
    Logger.log("💬 Gemini respondió solo con texto.");
    return textResponseFromModel;
  }

  return "El modelo no pudo generar una respuesta clara.";
}
