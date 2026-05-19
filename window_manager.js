// window_manager.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const { events } = require('./events.js');

class WindowManager {
  constructor() {
    this.activeWindow = null;
    this.lastUpdate = 0;
  }

  async getActiveWindow() {
    try {
      // সরল PowerShell কমান্ড (কম এস্কেপ ঝামেলা)
      const { stdout } = await execPromise(`powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object -First 1 | Format-List Name,MainWindowTitle,Id"`);
      const lines = stdout.split('\n');
      let processName = 'unknown', windowTitle = '', pid = 0;
      for (const line of lines) {
        if (line.includes('Name :')) processName = line.split(':')[1].trim();
        if (line.includes('MainWindowTitle :')) windowTitle = line.split(':')[1].trim();
        if (line.includes('Id :')) pid = parseInt(line.split(':')[1].trim(), 10);
      }
      const result = { processName, windowTitle, pid };
      this.activeWindow = result;
      this.lastUpdate = Date.now();
      events.emit('window:active-changed', result);
      return result;
    } catch (err) {
      events.emit('window:error', err.message);
      return null;
    }
  }

  async focusProcess(processName) {
    try {
      await execPromise(`powershell -Command "Start-Process -FilePath '${processName}' -WindowStyle Maximized"`);
      return true;
    } catch (err) {
      events.emit('window:focus-error', err.message);
      return false;
    }
  }
}

const windowManager = new WindowManager();
module.exports = { windowManager };
