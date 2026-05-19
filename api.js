// api.js - Gemini + Local DeepSeek (Ollama) Fallback System
const fetch = require('node-fetch');
const { events } = require('./events.js');
const { memory } = require('./memory.js');

class HybridAPI {
  constructor() {
    // Gemini config
    this.geminiApiKey = 'AIzaSyD9Th2laiRCvE5z7QbA62e4CZxopudtPCw';
    this.geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    
    // Local Ollama config
    this.ollamaEndpoint = 'http://localhost:11434/api/generate';
    this.ollamaModel = 'deepseek-r1:1.5b';  // তোমার ডাউনলোড করা মডেলের নাম দিন
    
    // টাইমআউট সেটিং (মিলিসেকেন্ড)
    this.timeout = 30000; // 30 সেকেন্ড
  }

  // জেমিনিতে কল করার ফাংশন
  async callGemini(prompt, systemInstruction, context) {
    const fullPrompt = `${systemInstruction}\n${context}\nUser: ${prompt}`;
    const requestBody = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.geminiEndpoint}?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
      const data = await response.json();
      const aiText = data.candidates[0].content.parts[0].text;
      return { success: true, text: aiText, source: 'gemini' };
    } catch (err) {
      clearTimeout(timeoutId);
      return { success: false, error: err.message, source: 'gemini' };
    }
  }

  // লোকাল ওলামা (DeepSeek) কল করার ফাংশন
  async callOllama(prompt, systemInstruction, context) {
    const fullPrompt = `System: ${systemInstruction}\n\n${context}\nUser: ${prompt}`;
    const requestBody = {
      model: this.ollamaModel,
      prompt: fullPrompt,
      stream: false,
      options: { temperature: 0.7, max_tokens: 1000 }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.ollamaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      const data = await response.json();
      const aiText = data.response;
      return { success: true, text: aiText, source: 'ollama' };
    } catch (err) {
      clearTimeout(timeoutId);
      return { success: false, error: err.message, source: 'ollama' };
    }
  }

  // মেইন ফাংশন – আগে জেমিনি, ব্যর্থ হলে ওলামা
  async sendToGemini(userPrompt) {
    // কনটেক্সট ও সিস্টেম ইন্সট্রাকশন তৈরি
    const context = memory.getContextForPrompt(userPrompt);
    const systemInstruction = `
You are Dragon AI Assistant, a desktop automation agent. Respond in Bengali or English.
When you need to perform a system action, embed a token exactly in this format: [SYS_ACT:TYPE:PARAMS]
Available types: MOUSE_MOVE:x,y, MOUSE_CLICK:left/right, KEYBOARD_TYPE:text, RUN_SHELL:command.
Do NOT use any other formatting. After the action, explain what you did.
Today's date: ${new Date().toLocaleString()}
    `;

    // ১. জেমিনি চেষ্টা
    events.emit('api:attempt', 'gemini');
    let result = await this.callGemini(userPrompt, systemInstruction, context);
    
    // ২. জেমিনি সফল হলে সেটাই রিটার্ন
    if (result.success) {
      events.emit('api:response', { source: 'gemini', text: result.text });
      await memory.remember(userPrompt, 'user_query');
      await memory.remember(result.text, 'ai_response');
      return result.text;
    }

    // ৩. জেমিনি ব্যর্থ – লগ করে ওলামা চেষ্টা
    events.emit('api:fallback', { from: 'gemini', error: result.error });
    console.warn(`Gemini failed: ${result.error}. Falling back to Ollama (${this.ollamaModel})`);
    
    // ৪. ওলামা কল
    const fallbackResult = await this.callOllama(userPrompt, systemInstruction, context);
    
    if (fallbackResult.success) {
      events.emit('api:response', { source: 'ollama', text: fallbackResult.text });
      await memory.remember(userPrompt, 'user_query');
      await memory.remember(fallbackResult.text, 'ai_response');
      return fallbackResult.text;
    } else {
      // দুই জায়গাই ব্যর্থ – ইউজারকে জানাও
      const errorMsg = `⚠️ কোন এআই মডেল সাড়া দিচ্ছে না।\nজেমিনি ত্রুটি: ${result.error}\nওলামা ত্রুটি: ${fallbackResult.error}\n\nদয়া করে নেটওয়ার্ক চেক করুন অথবা নিশ্চিত করুন যে \`ollama serve\` চালু আছে।`;
      events.emit('api:error', errorMsg);
      return errorMsg;
    }
  }
}

const api = new HybridAPI();
module.exports = { api };
