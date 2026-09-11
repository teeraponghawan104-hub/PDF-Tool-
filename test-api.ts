import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  const models = [
    "gemini-3.1-pro-preview",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash"
  ];
  for (const model of models) {
    try {
      console.log(`Testing ${model}...`);
      await ai.models.generateContent({
        model,
        contents: { parts: [{text: "Hi"}] }
      });
      console.log(`${model} OK!`);
    } catch (e: any) {
      console.log(`${model} ERROR:`, e.status, e.message);
    }
  }
}
test();
