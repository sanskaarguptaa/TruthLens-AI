import { GoogleGenAI, Type } from '@google/genai';

async function test() {
  const apiKey = "AIzaSyDIM6KoGo8z5TH1yheePHzTwZ0qs8B8N90";
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "The moon is cheese",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    console.log("Response:", response.text);
  } catch (err) {
    console.error("ERROR CAUGHT:");
    console.error(err);
  }
}
test();
