// updater.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { events } = require('./events.js');

class Updater {
  constructor() {
    this.manifestUrl = 'https://raw.githubusercontent.com/your-repo/dragon-assistant/manifest.json'; // replace with actual
    this.fallbackManifest = null;
  }

  async computeFileHash(filePath) {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async fetchManifest() {
    try {
      const response = await fetch(this.manifestUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Could not fetch remote manifest, using fallback');
    }
    return this.fallbackManifest || {};
  }

  async verifyAndRepair(fileName, expectedHash, fallbackContent) {
    const filePath = path.join(__dirname, fileName);
    try {
      const actualHash = await this.computeFileHash(filePath);
      if (actualHash === expectedHash) return true;
      // Hash mismatch – repair
      await fs.writeFile(filePath, fallbackContent, 'utf8');
      events.emit('updater:repaired', fileName);
      return true;
    } catch (err) {
      // File missing – create it
      await fs.writeFile(filePath, fallbackContent, 'utf8');
      events.emit('updater:created', fileName);
      return true;
    }
  }

  async runSelfHealing() {
    const manifest = await this.fetchManifest();
    // Example manifest structure: { "core.js": "sha256...", "engine.js": "sha256..." }
    for (const [file, hash] of Object.entries(manifest)) {
      const fallbackContent = this.getFallbackContent(file);
      await this.verifyAndRepair(file, hash, fallbackContent);
    }
  }

  getFallbackContent(fileName) {
    // Provide minimal fallback code for critical files
    const fallbacks = {
      'core.js': 'module.exports = { core: { init: () => console.log("fallback core") } };',
      'engine.js': 'module.exports = { engine: { submitUserCommand: () => {} } };'
    };
    return fallbacks[fileName] || '// fallback empty module';
  }
}

const updater = new Updater();
module.exports = { updater };
