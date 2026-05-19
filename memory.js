// memory.js
const fs = require('fs').promises;
const path = require('path');
const { appState } = require('./state.js');
const { events } = require('./events.js');

class SemanticMemory {
  constructor() {
    this.memoryFilePath = path.join(__dirname, 'long_term_memory.json');
    this.memories = []; // array of { text, timestamp, type }
    this.load();
  }

  async load() {
    try {
      const data = await fs.readFile(this.memoryFilePath, 'utf8');
      this.memories = JSON.parse(data);
    } catch (err) {
      this.memories = [];
    }
  }

  async save() {
    await fs.writeFile(this.memoryFilePath, JSON.stringify(this.memories, null, 2));
  }

  /**
   * Store a conversation entry or user preference.
   * @param {string} text - The content to remember
   * @param {string} type - e.g., 'user_query', 'ai_response', 'preference'
   */
  async remember(text, type = 'user_query') {
    this.memories.push({
      text,
      type,
      timestamp: Date.now()
    });
    // Keep only last 1000 entries to avoid bloat
    if (this.memories.length > 1000) this.memories.shift();
    await this.save();
    events.emit('memory:stored', { type, preview: text.slice(0, 50) });
  }

  /**
   * Search relevant memories based on keyword overlap.
   * @param {string} query - The user's current prompt
   * @param {number} limit - Maximum number of memories to return
   * @returns {string[]} Array of memory texts
   */
  recall(query, limit = 5) {
    const words = query.toLowerCase().split(/\s+/);
    const scored = this.memories.map(mem => {
      const memText = mem.text.toLowerCase();
      let score = 0;
      for (const w of words) {
        if (memText.includes(w)) score += 1;
      }
      // Boost recency: newer memories have higher score
      const ageHours = (Date.now() - mem.timestamp) / (1000 * 3600);
      score += Math.max(0, 1 - ageHours / 48); // 48 hour half-life
      return { ...mem, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(m => `[${m.type}] ${m.text}`);
  }

  /**
   * Inject relevant memories into the system prompt of Gemini.
   * @param {string} userPrompt - The current user input
   * @returns {string} Formatted context string
   */
  getContextForPrompt(userPrompt) {
    const relevant = this.recall(userPrompt, 3);
    if (relevant.length === 0) return '';
    return `Previous relevant memories:\n${relevant.join('\n')}\n\n`;
  }
}

const memory = new SemanticMemory();
module.exports = { memory };
