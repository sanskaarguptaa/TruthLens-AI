import { GoogleGenAI, Type } from '@google/genai';

async function test() {
  const apiKey = "<INSERT YOUR API KEY>";
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
