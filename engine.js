// engine.js
const { events } = require('./events.js');
const { appState } = require('./state.js');
const { modules } = require('./modules.js');
const { utils } = require('./utils.js');

class Engine {
  constructor() {
    this.actionPattern = /\[SYS_ACT:(\w+):(.*?)\]/g;
  }
  
  // Scan raw AI text, extract tokens, return cleaned text + actions
  processAIReply(rawText) {
    const actions = [];
    let cleanText = rawText;
    let match;
    
    while ((match = this.actionPattern.exec(rawText)) !== null) {
      const type = match[1];
      const params = match[2];
      actions.push({
        type: type,
        params: params,
        raw: `[${type}] ${params}`
      });
      // Remove the token from displayed text
      cleanText = cleanText.replace(match[0], '');
    }
    
    // Trim extra whitespace
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    if (cleanText === '') cleanText = '[কোনো টেক্সট নেই]';
    
    return { cleanText, actions };
  }
  
  // Execute a single action (called after user confirmation)
  async executeAction(action) {
    const { type, params } = action;
    const ipcRenderer = require('electron').ipcRenderer;
    
    try {
      switch (type) {
        case 'MOUSE_MOVE':
          const [x, y] = params.split(',').map(Number);
          if (isNaN(x) || isNaN(y)) throw new Error('Invalid coordinates');
          await ipcRenderer.invoke('mouse-move', x, y);
          break;
        case 'MOUSE_CLICK':
          await ipcRenderer.invoke('mouse-click', params);
          break;
        case 'KEYBOARD_TYPE':
          await ipcRenderer.invoke('keyboard-type', params);
          break;
        case 'RUN_SHELL':
          const output = await ipcRenderer.invoke('run-shell', params);
          events.emit('engine:shell-output', output);
          break;
        default:
          throw new Error(`Unknown action type: ${type}`);
      }
      events.emit('engine:action-success', action);
    } catch (err) {
      events.emit('engine:action-error', action, err.message);
      throw err;
    }
  }
  
  // Helper: request a command from the engine (called by UI)
  async submitUserCommand(userText) {
    events.emit('engine:command-request', userText);
  }
}

const engine = new Engine();
module.exports = { engine };
