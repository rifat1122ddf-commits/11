// modules.js
const fs = require('fs');
const path = require('path');
const { appState } = require('./state.js');
const { events } = require('./events.js');

class ModuleManager {
  constructor() {
    this.modules = new Map();
    this.notesPath = path.join(__dirname, 'user_notes.json');
    this.initNotesStore();
  }
  
  initNotesStore() {
    if (!fs.existsSync(this.notesPath)) {
      fs.writeFileSync(this.notesPath, JSON.stringify([]));
    }
  }
  
  register(name, moduleObj) {
    if (this.modules.has(name)) {
      console.warn(`Module ${name} already registered`);
      return;
    }
    this.modules.set(name, moduleObj);
    if (moduleObj.init) moduleObj.init();
    events.emit('module:registered', name);
  }
  
  unregister(name) {
    const mod = this.modules.get(name);
    if (mod && mod.destroy) mod.destroy();
    this.modules.delete(name);
    events.emit('module:unregistered', name);
  }
  
  // ---------- Calculator Module ----------
  calculatorEval(expr) {
    try {
      // Safe eval using Function constructor (no access to scope)
      const result = Function(`'use strict'; return (${expr})`)();
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  
  // ---------- Notes Manager ----------
  saveNote(title, content) {
    const notes = JSON.parse(fs.readFileSync(this.notesPath, 'utf8'));
    notes.push({ title, content, timestamp: Date.now() });
    fs.writeFileSync(this.notesPath, JSON.stringify(notes, null, 2));
    events.emit('notes:saved', title);
    return true;
  }
  
  getAllNotes() {
    return JSON.parse(fs.readFileSync(this.notesPath, 'utf8'));
  }
  
  // ---------- System Info ----------
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

const modules = new ModuleManager();
module.exports = { modules };
