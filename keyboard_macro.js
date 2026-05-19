// keyboard_macro.js
const robot = require('robotjs');
const { events } = require('./events.js');

class MacroEngine {
  constructor() {
    this.modifiers = {
      CTRL: 'control',
      ALT: 'alt',
      SHIFT: 'shift',
      CMD: 'command',
      WIN: 'command'
    };
  }

  /**
   * Parse a macro string like "[CTRL+ALT+T]" or "[WIN+R]"
   * @param {string} macroStr - e.g., "CTRL+ALT+T" (without brackets)
   * @returns {object} { keys: string[], modifierFlags: object }
   */
  parseMacro(macroStr) {
    const parts = macroStr.toUpperCase().split('+');
    const keys = [];
    const modifierFlags = { control: false, alt: false, shift: false, command: false };
    for (const part of parts) {
      if (this.modifiers[part]) {
        const mod = this.modifiers[part];
        modifierFlags[mod] = true;
      } else {
        keys.push(part);
      }
    }
    return { keys, modifierFlags };
  }

  /**
   * Execute a complex key combination.
   * @param {string} macroString - e.g., "CTRL+ALT+T"
   * @param {number} delayMs - Delay between key-down and key-up (default 50ms)
   * @returns {Promise<void>}
   */
  async executeMacro(macroString, delayMs = 50) {
    const { keys, modifierFlags } = this.parseMacro(macroString);
    if (keys.length === 0) throw new Error('No main key specified in macro');

    // Press modifiers
    if (modifierFlags.control) robot.keyToggle('control', 'down');
    if (modifierFlags.alt) robot.keyToggle('alt', 'down');
    if (modifierFlags.shift) robot.keyToggle('shift', 'down');
    if (modifierFlags.command) robot.keyToggle('command', 'down');

    // Press and release the main key(s)
    for (const key of keys) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      robot.keyTap(key.toLowerCase());
    }

    // Release modifiers in reverse order
    if (modifierFlags.command) robot.keyToggle('command', 'up');
    if (modifierFlags.shift) robot.keyToggle('shift', 'up');
    if (modifierFlags.alt) robot.keyToggle('alt', 'up');
    if (modifierFlags.control) robot.keyToggle('control', 'up');

    events.emit('macro:executed', macroString);
  }

  /**
   * Register this module into the engine's action handler.
   * Called from core.js during init.
   */
  register() {
    const { engine } = require('./engine.js');
    // Monkey-patch or extend engine action handler? Simpler: add a new action type.
    // We'll rely on core.js to extend the token handling.
    events.on('engine:custom-macro', async (macroStr) => {
      await this.executeMacro(macroStr);
    });
    console.log('Keyboard macro engine registered');
  }
}

const macroEngine = new MacroEngine();
module.exports = { macroEngine };
