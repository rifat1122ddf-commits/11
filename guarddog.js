// guarddog.js
const { events } = require('./events.js');

class GuardDog {
  constructor() {
    this.blacklistPatterns = [
      /rm\s+-rf\s+(\/|\*|~)/i,           // dangerous deletion
      /del\s+\/f\s+\/s\s+[A-Z]:\\/i,      // Windows force delete system drive
      /format\s+[a-z]:/i,
      /reg\s+delete\s+HKEY_LOCAL_MACHINE/i,
      /::\$DATA/i,
      /crypt/i,                            // ransomware keywords
      /powershell\s+-command\s+"[^"]*wipe/i,
      /rd\s+\/s\s+[A-Z]:\\/i
    ];
  }

  /**
   * Validate a shell command or action token.
   * @param {string} command - The raw shell command to validate
   * @returns {object} { safe: boolean, reason: string|null }
   */
  validateShellCommand(command) {
    for (const pattern of this.blacklistPatterns) {
      if (pattern.test(command)) {
        const reason = `Blacklisted pattern: ${pattern}`;
        events.emit('guarddog:blocked', { command, reason });
        return { safe: false, reason };
      }
    }
    // Also reject if command length > 500 characters (prevent injection bombs)
    if (command.length > 500) {
      return { safe: false, reason: 'Command too long (possible injection)' };
    }
    return { safe: true, reason: null };
  }

  /**
   * Validate a mouse move coordinate (prevent off-screen infinite loops).
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  validateCoordinates(x, y) {
    const { screen } = require('electron').screen;
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.size;
    return (x >= 0 && x <= width && y >= 0 && y <= height);
  }

  /**
   * Hook into engine's action execution pipeline.
   * Should be called before the confirmation modal.
   */
  installInterceptor() {
    const { engine } = require('./engine.js');
    const originalExecute = engine.executeAction;
    engine.executeAction = async (action) => {
      if (action.type === 'RUN_SHELL') {
        const validation = this.validateShellCommand(action.params);
        if (!validation.safe) {
          events.emit('guarddog:critical-block', action.params, validation.reason);
          const { ui } = require('./ui.js');
          ui.addMessage(`🛡️ নিরাপত্তা ব্লক: ${validation.reason}`, 'system');
          return;
        }
      } else if (action.type === 'MOUSE_MOVE') {
        const [x, y] = action.params.split(',').map(Number);
        if (!this.validateCoordinates(x, y)) {
          events.emit('guarddog:mouse-block', x, y);
          return;
        }
      }
      return originalExecute.call(engine, action);
    };
    console.log('GuardDog interceptor installed');
  }
}

const guardDog = new GuardDog();
module.exports = { guardDog };
