// scheduler.js
const fs = require('fs').promises;
const path = require('path');
const { events } = require('./events.js');
const { appState } = require('./state.js');

class Scheduler {
  constructor() {
    this.tasks = []; // { id, cronExpression? (simplified: nextRun timestamp), command, enabled }
    this.intervalId = null;
    this.scheduleFile = path.join(__dirname, 'scheduled_tasks.json');
    this.loadTasks();
  }

  async loadTasks() {
    try {
      const data = await fs.readFile(this.scheduleFile, 'utf8');
      this.tasks = JSON.parse(data);
    } catch (err) {
      this.tasks = [];
    }
  }

  async saveTasks() {
    await fs.writeFile(this.scheduleFile, JSON.stringify(this.tasks, null, 2));
  }

  /**
   * Add a new task.
   * @param {string} description - Human readable
   * @param {number} timestampMs - Unix timestamp in milliseconds
   * @param {string} command - Shell command or action token string
   */
  async addTask(description, timestampMs, command) {
    const id = Date.now() + '_' + Math.random().toString(36);
    this.tasks.push({
      id,
      description,
      nextRun: timestampMs,
      command,
      enabled: true
    });
    this.tasks.sort((a, b) => a.nextRun - b.nextRun);
    await this.saveTasks();
    events.emit('scheduler:task-added', description);
    this.startWatcher();
  }

  async removeTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    await this.saveTasks();
  }

  startWatcher() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.checkTasks(), 1000);
  }

  checkTasks() {
    const now = Date.now();
    const due = this.tasks.filter(t => t.enabled && t.nextRun <= now);
    for (const task of due) {
      this.executeTask(task);
      // Remove one-time tasks
      this.tasks = this.tasks.filter(t => t.id !== task.id);
    }
    if (due.length > 0) this.saveTasks();
  }

  async executeTask(task) {
    events.emit('scheduler:execute', task.description);
    // Trigger the core engine to process this command as if user typed it
    const { engine } = require('./engine.js');
    engine.submitUserCommand(`[SCHEDULED] ${task.command}`);
  }
}

const scheduler = new Scheduler();
module.exports = { scheduler };
