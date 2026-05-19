// state.js
const fs = require('fs');
const path = require('path');

class State {
  constructor() {
    this.data = new Map();
    this.listeners = new Map();
    this.persistPath = path.join(__dirname, 'dragon_state.json');
  }
  
  get(key) {
    return this.data.get(key);
  }
  
  set(key, value) {
    const old = this.data.get(key);
    this.data.set(key, value);
    const listeners = this.listeners.get(key) || [];
    listeners.forEach(fn => fn(value, old));
  }
  
  subscribe(key, listener) {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(listener);
    return () => {
      const arr = this.listeners.get(key);
      if (arr) this.listeners.set(key, arr.filter(l => l !== listener));
    };
  }
  
  loadPersistent() {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, 'utf8');
        const obj = JSON.parse(raw);
        for (const [k, v] of Object.entries(obj)) {
          this.set(k, v);
        }
      }
    } catch (err) {
      console.error('Failed to load state', err);
    }
  }
  
  savePersistent() {
    const obj = {};
    for (const [k, v] of this.data.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(this.persistPath, JSON.stringify(obj, null, 2));
  }
}

const appState = new State();
module.exports = { appState };
