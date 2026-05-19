// api.js
const { events } = require('./events.js');

class GeminiAPI {
  constructor() {
    this.apiKey = 'AIzaSyD9Th2laiRCvE5z7QbA62e4CZxopudtPCw';
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
  }
  
  async sendToGemini(userPrompt) {
    const systemInstruction = `
You are Dragon AI Assistant, a desktop automation agent. You must respond in Bengali or English as the user speaks.
When you need to perform a system action, embed a token exactly in this format: [SYS_ACT:TYPE:PARAMS]
Available types:
- MOUSE_MOVE:x,y   (x and y as numbers)
- MOUSE_CLICK:left or right
- KEYBOARD_TYPE:text_to_type
- RUN_SHELL:command (any shell command)
Do NOT use any other formatting. You may combine multiple tokens. After the action, explain what you did.
Always ask for confirmation in natural language before dangerous actions, but the token will trigger the confirmation UI.
Today's date: ${new Date().toLocaleString()}
    `;
    
    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemInstruction },
            { text: userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    };
    
    try {
      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      const aiText = data.candidates[0].content.parts[0].text;
      events.emit('api:response', aiText);
      return aiText;
    } catch (err) {
      events.emit('api:error', err.message);
      return `দুঃখিত, একটি ত্রুটি ঘটেছে: ${err.message}`;
    }
  }
}

const api = new GeminiAPI();
module.exports = { api };
