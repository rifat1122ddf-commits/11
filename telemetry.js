// telemetry.js
const os = require('os');
const { events } = require('./events.js');

class Telemetry {
  constructor() {
    this.lastCpuUsage = os.cpus();
    this.intervalId = null;
  }

  /**
   * Get current CPU usage percentage (average across all cores).
   * @returns {number} 0-100
   */
  getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    const idleDiff = totalIdle - (this.lastTotalIdle || 0);
    const tickDiff = totalTick - (this.lastTotalTick || 0);
    this.lastTotalIdle = totalIdle;
    this.lastTotalTick = totalTick;
    const usage = 100 - (idleDiff / tickDiff) * 100;
    return isNaN(usage) ? 0 : Math.min(100, Math.max(0, usage));
  }

  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
      totalGB: (total / 1e9).toFixed(2),
      usedGB: (used / 1e9).toFixed(2),
      percent: ((used / total) * 100).toFixed(1)
    };
  }

  getSystemUptime() {
    return os.uptime(); // seconds
  }

  startMonitoring(intervalMs = 2000) {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      const cpuPercent = this.getCpuUsage();
      const mem = this.getMemoryUsage();
      const uptime = this.getSystemUptime();
      events.emit('telemetry:update', { cpu: cpuPercent, memory: mem, uptime });
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}

const telemetry = new Telemetry();
module.exports = { telemetry };
