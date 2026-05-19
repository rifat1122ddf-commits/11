// engine.js
const { events } = require('./events.js');
const { appState } = require('./state.js');
const { modules } = require('./modules.js');
const { utils } = require('./utils.js');
const { ipcRenderer } = require('electron');   // ✅ ipcRenderer সঠিকভাবে ইম্পোর্ট

class Engine {
  constructor() {
    this.actionPattern = /\[SYS_ACT:(\w+):(.*?)\]/g;
  }

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
      cleanText = cleanText.replace(match[0], '');
    }

    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    if (cleanText === '') cleanText = '[কোনো টেক্সট নেই]';
    return { cleanText, actions };
  }

  async executeAction(action) {
    const { type, params } = action;

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

  async submitUserCommand(userText) {
    events.emit('engine:command-request', userText);
  }
}

const engine = new Engine();
module.exports = { engine };
