🛠️ ToolExecutor

Clase en Google Apps Script que permite registrar y ejecutar funciones
de herramientas que el modelo Gemini puede invocar durante una
conversación.

------------------------------------------------------------------------

🚀 Características principales

-   📂 Registro dinámico de funciones disponibles para Gemini.
-   ⚡ Ejecución segura con validación de argumentos y manejo de
    errores.
-   📝 Logs automáticos para depuración (Logger.log).
-   🔒 Evita llamadas a funciones no registradas.

------------------------------------------------------------------------

📦 Instalación

Copia la clase ToolExecutor en tu proyecto de Google Apps Script.
No requiere dependencias externas.

------------------------------------------------------------------------

🔑 Uso básico

    // Inicializar ToolExecutor
    const executor = new ToolExecutor();

    // Registrar una herramienta
    executor.registerTool("getDate", () => {
      return new Date().toISOString();
    });

    // Simular llamada desde Gemini
    const result = executor.executeToolCall({
      name: "getDate",
      args: {}
    });

    Logger.log(result);

------------------------------------------------------------------------

📂 Métodos

registerTool(functionName, implementation)

Registra una función disponible para Gemini.

-   functionName: string → Nombre de la función definido en el esquema
    (ej: "getWeather").
-   implementation: Function → Función real de JavaScript.

Ejemplo:

    executor.registerTool("getWeather", ({ city }) => {
      return `El clima en ${city} es soleado.`;
    });

------------------------------------------------------------------------

executeToolCall(geminiFunctionCall)

Ejecuta una herramienta previamente registrada.

-   geminiFunctionCall: Object con estructura:

        { "name": "getWeather", "args": { "city": "Madrid" } }

-   Retorna: cualquier valor retornado por la función.

-   Errores: lanza excepción si la función no está registrada o falla la
    ejecución.

Ejemplo:

    const respuesta = executor.executeToolCall({
      name: "getWeather",
      args: { city: "Madrid" }
    });

    Logger.log(respuesta); // "El clima en Madrid es soleado."

------------------------------------------------------------------------

⚙️ Buenas prácticas

1.  Nombres consistentes: Usa los mismos nombres de funciones que
    definas en el esquema de Gemini (functionDeclarations).
2.  Validación de argumentos: Implementa checks dentro de cada
    herramienta para evitar datos inválidos.
3.  Errores controlados: Usa try/catch en las implementaciones para
    manejar errores sin romper la conversación.
4.  Módulos reutilizables: Define herramientas genéricas que puedan
    aplicarse a diferentes escenarios (ej. getDate, formatText,
    queryDatabase).
5.  Logs para depuración: Aprovecha Logger.log para verificar entradas y
    salidas de cada herramienta.

------------------------------------------------------------------------

📖 Ejemplo completo

    function ejemploToolExecutor() {
      const executor = new ToolExecutor();

      // Registrar funciones
      executor.registerTool("getDate", () => new Date().toLocaleDateString());
      executor.registerTool("sumNumbers", ({ a, b }) => a + b);

      // Simular llamada de Gemini a "sumNumbers"
      const call = {
        name: "sumNumbers",
        args: { a: 10, b: 20 }
      };

      const resultado = executor.executeToolCall(call);
      Logger.log(`Resultado: ${resultado}`); // 30
    }

------------------------------------------------------------------------

📜 Licencia

Este código se distribuye bajo licencia MIT.
Puedes modificarlo y adaptarlo libremente en tus proyectos.
