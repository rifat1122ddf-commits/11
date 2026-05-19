// file_indexer.js
const fs = require('fs').promises;
const path = require('path');
const { events } = require('./events.js');
const { appState } = require('./state.js');

class FileIndexer {
  constructor() {
    this.index = new Map(); // key: filename (lowercase) -> array of file paths
    this.isIndexing = false;
    this.indexedDirs = ['Documents', 'Downloads', 'Desktop'];
    this.indexFilePath = path.join(__dirname, 'file_index.json');
    this.loadIndex();
  }

  async loadIndex() {
    try {
      const data = await fs.readFile(this.indexFilePath, 'utf8');
      const parsed = JSON.parse(data);
      this.index = new Map(Object.entries(parsed));
    } catch (err) {
      // no previous index
    }
  }

  async saveIndex() {
    const obj = Object.fromEntries(this.index);
    await fs.writeFile(this.indexFilePath, JSON.stringify(obj, null, 2));
  }

  /**
   * Recursively scan a directory and index all files.
   * @param {string} dirPath - absolute path
   */
  async indexDirectory(dirPath) {
    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (err) {
      return; // skip inaccessible
    }
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await this.indexDirectory(fullPath);
      } else if (entry.isFile()) {
        const lowerName = entry.name.toLowerCase();
        if (!this.index.has(lowerName)) this.index.set(lowerName, []);
        const arr = this.index.get(lowerName);
        if (!arr.includes(fullPath)) arr.push(fullPath);
      }
    }
  }

  /**
   * Start full indexing of standard user folders.
   */
  async startFullIndex() {
    if (this.isIndexing) return;
    this.isIndexing = true;
    events.emit('file-index:start');
    for (const dirName of this.indexedDirs) {
      const userDir = path.join(require('os').homedir(), dirName);
      try {
        await fs.access(userDir);
        await this.indexDirectory(userDir);
      } catch (err) {
        console.warn(`Cannot index ${userDir}:`, err.message);
      }
    }
    await this.saveIndex();
    this.isIndexing = false;
    events.emit('file-index:complete', this.index.size);
  }

  /**
   * Search files by filename (case-insensitive).
   * @param {string} query - partial or full filename
   * @returns {string[]} Array of absolute file paths
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];
    for (const [name, paths] of this.index.entries()) {
      if (name.includes(lowerQuery)) {
        results.push(...paths);
      }
    }
    return results.slice(0, 20); // limit results
  }
}

const fileIndexer = new FileIndexer();
module.exports = { fileIndexer };
