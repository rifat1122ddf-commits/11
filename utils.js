// utils.js
class Utils {
  static formatTimestamp(date = new Date()) {
    return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}:${date.getSeconds().toString().padStart(2,'0')}`;
  }
  
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  static debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
  
  static sanitizeCommand(cmd) {
    // Basic sanitization – remove dangerous characters
    return cmd.replace(/[;&|`$]/g, '');
  }
  
  static randomId() {
    return Math.random().toString(36).substring(2, 10);
  }
  
  static parseCoordinates(str) {
    const parts = str.split(',').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { x: parts[0], y: parts[1] };
    }
    return null;
  }
}

module.exports = { utils: Utils };
