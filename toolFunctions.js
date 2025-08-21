/**
 * Diccionario con la definición de funciones para Gemini (versión 2).
 * Ejemplo con varias herramientas que cubren distintos casos de uso.
 */
function toolFunctions() {
  const myTools = [
    {
      "functionDeclarations": [
        {
          "name": "getCurrentDate",
          "description": "Devuelve la fecha actual en formato ISO (YYYY-MM-DD).",
          "parameters": {
            "type": "object",
            "properties": {},
            "required": []
          }
        },
        {
          "name": "calculateBMI",
          "description": "Calcula el índice de masa corporal (IMC) a partir del peso y la altura.",
          "parameters": {
            "type": "object",
            "properties": {
              "weight": {
                "type": "number",
                "description": "Peso de la persona en kilogramos."
              },
              "height": {
                "type": "number",
                "description": "Altura de la persona en metros."
              }
            },
            "required": ["weight", "height"]
          }
        },
        {
          "name": "getExchangeRate",
          "description": "Obtiene el tipo de cambio entre dos monedas.",
          "parameters": {
            "type": "object",
            "properties": {
              "fromCurrency": {
                "type": "string",
                "description": "Código de la moneda de origen (ejemplo: 'USD')."
              },
              "toCurrency": {
                "type": "string",
                "description": "Código de la moneda de destino (ejemplo: 'EUR')."
              }
            },
            "required": ["fromCurrency", "toCurrency"]
          }
        }
      ]
    }
  ];
  return myTools;
}
