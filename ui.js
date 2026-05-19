// ui.js
const { events } = require('./events.js');
const { appState } = require('./state.js');

class UI {
  constructor() {
    this.chatContainer = null;
    this.inputField = null;
    this.typingIndicator = null;
    this.confirmModal = null;
    this.pendingResolve = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
  
  // Return full HTML string for Electron to load
  getUIHTML() {
    return `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dragon AI Assistant</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          user-select: none;
        }
        body {
          background: radial-gradient(circle at 20% 30%, #0a0a0f, #000000);
          font-family: 'Segoe UI', 'Poppins', 'Noto Sans Bengali', sans-serif;
          overflow: hidden;
          height: 100vh;
          color: #e2e8f0;
        }
        /* Glassmorphism Window Bar */
        .titlebar {
          -webkit-app-region: drag;
          background: rgba(10, 10, 20, 0.7);
          backdrop-filter: blur(20px);
          height: 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .titlebar h3 {
          font-size: 1rem;
          letter-spacing: 2px;
          background: linear-gradient(135deg, #ef4444, #3b82f6);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .window-controls button {
          -webkit-app-region: no-drag;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 1.2rem;
          margin-left: 12px;
          cursor: pointer;
          transition: 0.2s;
        }
        .window-controls button:hover {
          color: #ef4444;
        }
        /* Main Layout */
        .main-container {
          display: flex;
          height: calc(100vh - 48px);
          padding: 16px;
          gap: 16px;
        }
        /* Left Side: Chat Panel */
        .chat-panel {
          flex: 2;
          background: rgba(15, 25, 35, 0.6);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          border: 1px solid rgba(59,130,246,0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .messages-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message {
          max-width: 80%;
          padding: 10px 16px;
          border-radius: 20px;
          font-size: 0.95rem;
          line-height: 1.4;
          animation: fadeIn 0.3s ease;
        }
        .user-message {
          align-self: flex-end;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .ai-message {
          align-self: flex-start;
          background: rgba(30, 41, 59, 0.8);
          border-left: 3px solid #ef4444;
          border-bottom-left-radius: 4px;
        }
        .system-message {
          align-self: center;
          background: rgba(0,0,0,0.5);
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: center;
        }
        .typing-indicator {
          display: none;
          align-self: flex-start;
          background: #1e293b;
          padding: 8px 16px;
          border-radius: 20px;
          gap: 6px;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out;
        }
        .input-area {
          display: flex;
          padding: 16px;
          gap: 12px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .input-area input {
          flex: 1;
          background: rgba(0,0,0,0.5);
          border: 1px solid #3b82f6;
          border-radius: 40px;
          padding: 12px 20px;
          color: white;
          font-size: 1rem;
          outline: none;
        }
        .input-area button {
          background: #ef4444;
          border: none;
          border-radius: 40px;
          padding: 0 20px;
          color: white;
          font-weight: bold;
          cursor: pointer;
          transition: 0.2s;
        }
        .input-area button:hover {
          background: #dc2626;
          box-shadow: 0 0 8px #ef4444;
        }
        /* Right Side: Canvas + Controls */
        .canvas-panel {
          flex: 1;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(8px);
          border-radius: 24px;
          border: 1px solid rgba(239,68,68,0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        canvas {
          flex: 1;
          width: 100%;
          background: black;
        }
        .control-buttons {
          display: flex;
          justify-content: space-around;
          padding: 12px;
          gap: 8px;
        }
        .ctrl-btn {
          background: rgba(59,130,246,0.2);
          border: 1px solid #3b82f6;
          border-radius: 30px;
          padding: 6px 12px;
          color: white;
          cursor: pointer;
          font-size: 0.8rem;
          transition: 0.2s;
        }
        .ctrl-btn:hover {
          background: #3b82f6;
        }
        /* Security Modal Overlay */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          visibility: hidden;
          opacity: 0;
          transition: 0.2s;
        }
        .modal-overlay.active {
          visibility: visible;
          opacity: 1;
        }
        .modal-content {
          background: #0f172a;
          border: 2px solid #ef4444;
          border-radius: 32px;
          padding: 28px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 0 40px rgba(239,68,68,0.4);
        }
        .modal-content h2 {
          color: #ef4444;
          margin-bottom: 16px;
        }
        .modal-buttons {
          margin-top: 24px;
          display: flex;
          gap: 20px;
          justify-content: center;
        }
        .modal-buttons button {
          padding: 8px 24px;
          border-radius: 40px;
          border: none;
          font-weight: bold;
          cursor: pointer;
        }
        #confirm-yes {
          background: #3b82f6;
          color: white;
        }
        #confirm-no {
          background: #334155;
          color: #ef4444;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      </style>
    </head>
    <body>
      <div class="titlebar">
        <h3>🐉 DRAGON AI ASSISTANT</h3>
        <div class="window-controls">
          <button id="minimizeBtn">─</button>
          <button id="closeBtn">✕</button>
        </div>
      </div>
      <div class="main-container">
        <div class="chat-panel">
          <div class="messages-area" id="messagesArea">
            <div class="message ai-message">🐉 নমস্কার! আমি ড্রাগন। আপনার কাজ আমি সহজ করে দেব। বাংলায় বলুন বা ইংরেজি।</div>
          </div>
          <div class="typing-indicator" id="typingIndicator">
            <span></span><span></span><span></span> <span style="width:auto; background:none;">ড্রাগন লিখছে...</span>
          </div>
          <div class="input-area">
            <input type="text" id="userInput" placeholder="আপনার কথা বলুন... (বাংলা/ইংরেজি)" autofocus>
            <button id="sendBtn">প্রেরণ</button>
            <button id="micBtn">🎤</button>
          </div>
        </div>
        <div class="canvas-panel">
          <canvas id="dragonCanvas"></canvas>
          <div class="control-buttons">
            <button class="ctrl-btn" id="clearChat">কথোপকথন মুছুন</button>
            <button class="ctrl-btn" id="sysInfo">সিস্টেম তথ্য</button>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="securityModal">
        <div class="modal-content">
          <h2>⚠️ নিরাপত্তা লক ⚠️</h2>
          <p id="modalActionText">অ্যাকশন বিবরণ</p>
          <div class="modal-buttons">
            <button id="confirm-no">বাতিল করুন (NO)</button>
            <button id="confirm-yes">অনুমতি দিন (YES)</button>
          </div>
        </div>
      </div>
      <script>
        // This script will be replaced by the actual UI controller binding (see below)
      </script>
    </body>
    </html>
    `;
  }
  
  // Bind UI elements after the window has loaded
  bindEvents() {
    this.chatContainer = document.getElementById('messagesArea');
    this.inputField = document.getElementById('userInput');
    this.typingIndicator = document.getElementById('typingIndicator');
    this.modalOverlay = document.getElementById('securityModal');
    
    document.getElementById('sendBtn').onclick = () => this.sendMessage();
    document.getElementById('micBtn').onclick = () => this.startSpeechRecognition();
    document.getElementById('clearChat').onclick = () => this.clearChat();
    document.getElementById('sysInfo').onclick = () => this.showSystemInfo();
    document.getElementById('minimizeBtn').onclick = () => require('electron').ipcRenderer.send('window-minimize');
    document.getElementById('closeBtn').onclick = () => require('electron').ipcRenderer.send('window-close');
    
    this.inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendMessage(); });
  }
  
  sendMessage() {
    const text = this.inputField.value.trim();
    if (!text) return;
    this.addMessage(text, 'user');
    this.inputField.value = '';
    const { engine } = require('./engine.js');
    engine.submitUserCommand(text);
  }
  
  addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    msgDiv.innerText = text;
    this.chatContainer.appendChild(msgDiv);
    msgDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
  
  showTyping(show) {
    this.typingIndicator.style.display = show ? 'flex' : 'none';
    if (show) this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }
  
  clearChat() {
    this.chatContainer.innerHTML = '';
    this.addMessage('কথোপকথন পরিষ্কার করা হয়েছে। নতুন সেশন শুরু করুন।', 'system');
  }
  
  async showSystemInfo() {
    const { modules } = require('./modules.js');
    const info = modules.getSystemInfo();
    this.addMessage(`সিস্টেম তথ্য:\nপ্ল্যাটফর্ম: ${info.platform}\nআর্কিটেকচার: ${info.arch}\nNode সংস্করণ: ${info.nodeVersion}`, 'system');
  }
  
  // Request confirmation from user (returns Promise<boolean>)
  requestActionConfirmation(actionDetails) {
    return new Promise((resolve) => {
      document.getElementById('modalActionText').innerText = actionDetails;
      this.modalOverlay.classList.add('active');
      const yesBtn = document.getElementById('confirm-yes');
      const noBtn = document.getElementById('confirm-no');
      const cleanup = () => {
        yesBtn.removeEventListener('click', onYes);
        noBtn.removeEventListener('click', onNo);
        this.modalOverlay.classList.remove('active');
      };
      const onYes = () => { cleanup(); resolve(true); };
      const onNo = () => { cleanup(); resolve(false); };
      yesBtn.addEventListener('click', onYes);
      noBtn.addEventListener('click', onNo);
    });
  }
  
  // Web Speech API for Bengali (bn-BD)
  startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.addMessage('🔇 আপনার ব্রাউজার স্পীচ রিকগনিশন সাপোর্ট করে না।', 'system');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.inputField.value = transcript;
      this.sendMessage();
    };
    recognition.onerror = (err) => {
      this.addMessage(`মাইক্রোফোন ত্রুটি: ${err.error}`, 'system');
    };
  }
}

const ui = new UI();
module.exports = { ui };
