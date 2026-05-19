// core.js
const { events } = require('./events.js');
const { appState } = require('./state.js');
const { engine } = require('./engine.js');
const { api } = require('./api.js');
const { modules } = require('./modules.js');
const { ui } = require('./ui.js');

class Core {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Load state from disk
    appState.loadPersistent();
    
    // Register core system modules
    modules.register('calculator', {
      init: () => console.log('Calculator module ready'),
      run: (expr) => modules.calculatorEval(expr)
    });
    
    modules.register('notes', {
      init: () => console.log('Notes module ready'),
      save: (title, content) => modules.saveNote(title, content),
      getAll: () => modules.getAllNotes()
    });
    
    // Start listening to engine events
    events.on('engine:command-request', async (userInput) => {
      // Show typing indicator
      ui.showTyping(true);
      
      // Call Gemini API via api.js
      const aiReply = await api.sendToGemini(userInput);
      
      // Process the reply (extract tokens) via engine
      const processed = engine.processAIReply(aiReply);
      
      // Display cleaned message
      ui.addMessage(processed.cleanText, 'ai');
      
      // If there are actions, trigger confirmation flow
      if (processed.actions.length > 0) {
        for (const action of processed.actions) {
          const confirmed = await ui.requestActionConfirmation(action.raw);
          if (confirmed) {
            await engine.executeAction(action);
            ui.addMessage(`✅ এক্সিকিউট করা হয়েছে: ${action.type}`, 'system');
          } else {
            ui.addMessage(`❌ বাতিল করা হয়েছে: ${action.type}`, 'system');
          }
        }
      }
      
      ui.showTyping(false);
    });
    
    this.initialized = true;
    events.emit('core:ready');
    console.log('Dragon AI Core is ready');
  }
  
  shutdown() {
    appState.savePersistent();
    events.emit('core:shutdown');
    process.exit(0);
  }
}

const core = new Core();
module.exports = { core };
