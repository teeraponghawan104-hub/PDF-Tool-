const { GoogleGenAI } = require('@google/genai');
try {
  new GoogleGenAI({ apiKey: undefined });
  console.log("Success");
} catch(e) {
  console.log("Error:", e.message);
}
