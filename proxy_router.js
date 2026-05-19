// proxy_router.js
const { events } = require('./events.js');

class ProxyRouter {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
  }

  randomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async fetchWithRetry(url, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': this.randomUserAgent() }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        // Simple sanitizer: remove script and style tags
        const sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                              .replace(/<[^>]+>/g, ' ') // remove all tags
                              .replace(/\s+/g, ' ')
                              .trim();
        return { success: true, content: sanitized.slice(0, 5000) }; // limit length
      } catch (err) {
        if (i === retries - 1) return { success: false, error: err.message };
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async scrapeWebsite(url) {
    events.emit('proxy:scrape-start', url);
    const result = await this.fetchWithRetry(url);
    if (result.success) {
      events.emit('proxy:scrape-success', url, result.content.length);
    } else {
      events.emit('proxy:scrape-error', url, result.error);
    }
    return result;
  }
}

const proxyRouter = new ProxyRouter();
module.exports = { proxyRouter };
