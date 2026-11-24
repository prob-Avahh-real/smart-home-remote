/**
 * Gesture control — camera + canvas motion/hand-shape detection (no ML deps)
 * Swipe left/right, open palm / fist toggle, thumbs up / down
 */

const SWIPE_THRESHOLD = 0.18;
const COOLDOWN_MS = 1200;
const ANALYSIS_W = 96;
const ANALYSIS_H = 72;

export class GestureControl {
  /** @param {{ onGesture: (gesture: string) => void, onStatus?: (status: string, active?: boolean) => void }} opts */
  constructor(opts) {
    this.onGesture = opts.onGesture;
    this.onStatus = opts.onStatus ?? (() => {});
    this.active = false;
    /** @type {MediaStream | null} */
    this.stream = null;
    /** @type {HTMLVideoElement | null} */
    this.video = null;
    /** @type {HTMLCanvasElement | null} */
    this.canvas = null;
    /** @type {CanvasRenderingContext2D | null} */
    this.ctx = null;
    /** @type {ImageData | null} */
    this.prevFrame = null;
    /** @type {number | null} */
    this.rafId = null;
    this.lastTrigger = 0;
    /** @type {{ x: number, y: number, t: number }[]} */
    this.centroidHistory = [];
    this.lastGestureLabel = '';
  }

  /** @param {string} videoId @param {string} canvasId */
  bindElements(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas?.getContext('2d', { willReadFrequently: true }) ?? null;
  }

  async toggle() {
    if (this.active) {
      this.stop();
      return;
    }
    await this.start();
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.onStatus('不支持摄像头', false);
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      if (!this.video || !this.canvas || !this.ctx) return;

      this.video.srcObject = this.stream;
      await this.video.play();
      this.canvas.width = ANALYSIS_W;
      this.canvas.height = ANALYSIS_H;
      this.active = true;
      this.prevFrame = null;
      this.centroidHistory = [];
      this.onStatus('手势识别中', true);
      this.loop();
    } catch (err) {
      const msg = err.name === 'NotAllowedError' ? '请允许摄像头权限' : `摄像头错误: ${err.message}`;
      this.onStatus(msg, false);
    }
  }

  stop() {
    this.active = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;
    this.prevFrame = null;
    this.centroidHistory = [];
    this.onStatus('手势已关闭', false);
  }

  loop() {
    if (!this.active || !this.video || !this.ctx || !this.canvas) return;
    this.rafId = requestAnimationFrame(() => this.analyze());
  }

  analyze() {
    if (!this.active || !this.video || !this.ctx || !this.canvas) return;

    this.ctx.drawImage(this.video, 0, 0, ANALYSIS_W, ANALYSIS_H);
    const frame = this.ctx.getImageData(0, 0, ANALYSIS_W, ANALYSIS_H);

    if (this.prevFrame) {
      const blob = this.detectMotionBlob(frame, this.prevFrame);
      if (blob.count > 80) {
        this.processBlob(blob);
      }
    }
    this.prevFrame = frame;
    this.loop();
  }

  /** @param {ImageData} curr @param {ImageData} prev */
  detectMotionBlob(curr, prev) {
    let minX = ANALYSIS_W;
    let minY = ANALYSIS_H;
    let maxX = 0;
    let maxY = 0;
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    const data = curr.data;
    const prevData = prev.data;

    for (let i = 0; i < data.length; i += 4) {
      const dr = Math.abs(data[i] - prevData[i]);
      const dg = Math.abs(data[i + 1] - prevData[i + 1]);
      const db = Math.abs(data[i + 2] - prevData[i + 2]);
      const diff = dr + dg + db;
      if (diff > 60) {
        const px = (i / 4) % ANALYSIS_W;
        const py = Math.floor(i / 4 / ANALYSIS_W);
        count++;
        sumX += px;
        sumY += py;
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }

    const cx = count ? sumX / count : 0;
    const cy = count ? sumY / count : 0;
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const area = width * height;
    const spread = count / Math.max(area, 1);

    return { count, cx, cy, width, height, area, spread, minX, minY, maxX, maxY };
  }

  /** @param {{ count: number, cx: number, cy: number, width: number, height: number, area: number, spread: number }} blob */
  processBlob(blob) {
    const now = Date.now();
    this.centroidHistory.push({ x: blob.cx / ANALYSIS_W, y: blob.cy / ANALYSIS_H, t: now });
    this.centroidHistory = this.centroidHistory.filter((p) => now - p.t < 500);

    if (now - this.lastTrigger < COOLDOWN_MS) return;

    // Swipe detection
    if (this.centroidHistory.length >= 4) {
      const first = this.centroidHistory[0];
      const last = this.centroidHistory[this.centroidHistory.length - 1];
      const dx = last.x - first.x;
      const dy = Math.abs(last.y - first.y);
      if (Math.abs(dx) > SWIPE_THRESHOLD && dy < 0.15) {
        this.fire(dx > 0 ? 'next_device' : 'prev_device', dx > 0 ? '右滑 → 下一设备' : '左滑 → 上一设备');
        return;
      }
    }

    const normY = blob.cy / ANALYSIS_H;
    const compact = blob.spread > 0.35;
    const large = blob.area > ANALYSIS_W * ANALYSIS_H * 0.08;

    // Thumbs up / down — compact blob in upper/lower region
    if (compact && blob.count > 120 && blob.count < 600) {
      if (normY < 0.35) {
        this.fire('power_on', '👍 开启');
        return;
      }
      if (normY > 0.65) {
        this.fire('power_off', '👎 关闭');
        return;
      }
    }

    // Open palm (large area) vs fist (compact, dense) → toggle
    if (large && blob.count > 200) {
      const areaRatio = blob.area / (ANALYSIS_W * ANALYSIS_H);
      if (areaRatio > 0.12 && blob.spread < 0.28) {
        this.fire('toggle_power', '✋ 张开手掌');
      } else if (areaRatio < 0.06 && blob.spread > 0.32) {
        this.fire('toggle_power', '✊ 握拳');
      }
    }
  }

  /** @param {string} gesture @param {string} label */
  fire(gesture, label) {
    this.lastTrigger = Date.now();
    this.lastGestureLabel = label;
    this.centroidHistory = [];
    this.onStatus(label, true);
    this.onGesture(gesture);
  }
}
