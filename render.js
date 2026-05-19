// render.js
class CanvasRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.particles = [];
  }
  
  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.createParticles(80);
    this.animate();
  }
  
  resize() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }
  
  createParticles(count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        alpha: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.6 ? '#ef4444' : '#3b82f6'
      });
    }
  }
  
  drawDragonSymbol(time) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const radius = Math.min(cx, cy) * 0.25;
    const pulse = Math.sin(time * 0.003) * 5;
    
    // Outer neon rings
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 12;
    this.ctx.shadowColor = '#ef4444';
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius - 10 + pulse * 0.5, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.stroke();
    
    // Dragon wing shapes (simple)
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 25, cy - 15);
    this.ctx.lineTo(cx, cy - 40);
    this.ctx.lineTo(cx + 25, cy - 15);
    this.ctx.fillStyle = 'rgba(239,68,68,0.4)';
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 30, cy + 5);
    this.ctx.lineTo(cx, cy - 10);
    this.ctx.lineTo(cx + 30, cy + 5);
    this.ctx.fillStyle = 'rgba(59,130,246,0.4)';
    this.ctx.fill();
    
    // Eye
    this.ctx.beginPath();
    this.ctx.arc(cx - 8, cy - 5, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(cx + 8, cy - 5, 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(cx - 7 + Math.sin(time * 0.01) * 1, cy - 5, 1.2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(cx + 9 + Math.sin(time * 0.01) * 1, cy - 5, 1.2, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
  }
  
  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Update and draw particles
    for (let p of this.particles) {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    this.drawDragonSymbol(Date.now());
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}

const renderer = new CanvasRenderer();
module.exports = { renderer };
