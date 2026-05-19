// vision.js
const { desktopCapturer } = require('electron');
const { events } = require('./events.js');
const { appState } = require('./state.js');

class VisionModule {
  constructor() {
    this.lastScreenshot = null;
  }

  /**
   * Capture the primary display as a base64-encoded JPEG image.
   * @returns {Promise<string>} base64 image string (data:image/jpeg;base64,...)
   */
  async captureScreen() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      if (sources.length === 0) throw new Error('No screen sources found');
      const source = sources[0];
      const base64 = source.thumbnail.toDataURL(); // 'data:image/png;base64,...'
      this.lastScreenshot = base64;
      events.emit('vision:screenshot', { timestamp: Date.now() });
      return base64;
    } catch (err) {
      events.emit('vision:error', err.message);
      throw err;
    }
  }

  /**
   * Attach the current screenshot to a Gemini API request payload.
   * @param {object} requestBody - The existing Gemini request body (contents array)
   * @returns {Promise<object>} Updated request body with inline image part
   */
  async attachScreenshotToGeminiPayload(requestBody) {
    const base64Image = await this.captureScreen();
    // Remove the "data:image/png;base64," prefix to get pure base64
    const pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const inlineData = {
      mimeType: 'image/jpeg',
      data: pureBase64
    };
    // Add the image as a new part in the first content item
    if (requestBody.contents && requestBody.contents[0]) {
      if (!requestBody.contents[0].parts) requestBody.contents[0].parts = [];
      requestBody.contents[0].parts.push({ inlineData });
    } else {
      requestBody.contents = [{ parts: [{ inlineData }] }];
    }
    return requestBody;
  }
}

const vision = new VisionModule();
module.exports = { vision };
