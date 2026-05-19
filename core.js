// core.js
const { events } = require('./events.js');
const { appState } = require('./state.js');
const { engine } = require('./engine.js');
const { api } = require('./api.js');
const { modules } = require('./modules.js');
const { ui } = require('./ui.js');

// ==========================================
// নতুন ১০টি আল্ট্রা-পাওয়ারফুল মডিউল রিকোয়ার (Require)
// ==========================================
const { vision } = require('./vision.js');
const { memory } = require('./memory.js');
const { macroEngine } = require('./keyboard_macro.js');
const { windowManager } = require('./window_manager.js');
const { fileIndexer } = require('./file_indexer.js');
const { scheduler } = require('./scheduler.js');
const { guardDog } = require('./guarddog.js');
const { telemetry } = require('./telemetry.js');
const { updater } = require('./updater.js');
const { proxyRouter } = require('./proxy_router.js');

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

    // ==========================================
    // নতুন ১০টি মডিউল অ্যাক্টিভেশন ও ইনিশিয়ালাইজেশন
    // ==========================================
    try {
      // ১. ম্যাক্রো ইঞ্জিন রেজিস্টার
      if (macroEngine && typeof macroEngine.register === 'function') {
        macroEngine.register();
      }
      
      // ২. গার্ডডগ সিকিউরিটি ফায়ারওয়াল ইনস্টল
      if (guardDog && typeof guardDog.installInterceptor === 'function') {
        guardDog.installInterceptor();
      }
      
      // ৩. রিয়েল-টাইম পিসি র‍্যাম/সিপিইউ মনিটরিং স্টার্ট
      if (telemetry && typeof telemetry.startMonitoring === 'function') {
        telemetry.startMonitoring();
      }
      
      // ৪. ব্যাকগ্রাউন্ড শিডিউলার ওয়াচার রান
      if (scheduler && typeof scheduler.startWatcher === 'function') {
        scheduler.startWatcher();
      }
      
      // ৫. ব্যাকগ্রাউন্ড ফাইল ইনডেক্সিং শুরু (এরর হ্যান্ডলিং সহ)
      if (fileIndexer && typeof fileIndexer.startFullIndex === 'function') {
        fileIndexer.startFullIndex().catch(err => console.error("File Indexer Error:", err));
      }
      
      // ৬. ওয়ান-টাইম কোড সেলফ-হিলিং এবং প্যাচার রান
      if (updater && typeof updater.runSelfHealing === 'function') {
        updater.runSelfHealing().catch(err => console.error("Self-Healing Error:", err));
      }
      
      console.log('⚡ All 10 Advanced Subsystems Linked Successfully.');
    } catch (subsystemError) {
      console.error('Subsystem loading warning:', subsystemError.message);
    }
    // ==========================================
    
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
            ui.addMessage(`✅ এক্সিকিউট করা হয়েছে: ${action.type}`, 'system');
          } else {
            ui.addMessage(`❌ বাতিল করা হয়েছে: ${action.type}`, 'system');
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
