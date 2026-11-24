// src/wearable-input.js
var WearableInput = class {
  /** @param {{ onGesture: (gesture: string) => void, onBadge?: (kind: string, text: string, active: boolean) => void }} opts */
  constructor(opts) {
    this.onGesture = opts.onGesture;
    this.onBadge = opts.onBadge ?? (() => {
    });
    this.ringActive = false;
    this.caneActive = false;
    this.ringFrame = 0;
    this.caneFrame = 0;
    this.ringPrevBeta = null;
    this.ringPrevGamma = null;
    this.caneLastAccel = { x: 0, y: 0, z: 0 };
    this.canePrevGamma = null;
  }
  setupRing() {
    if (typeof DeviceOrientationEvent === "undefined") return;
    this.onBadge("ring", "\u{1F48D} \u70B9\u51FB\u542F\u7528", false);
    const enable = async () => {
      try {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm !== "granted") return;
        }
        this.ringActive = true;
        this.onBadge("ring", "\u{1F48D} \u5DF2\u8FDE\u63A5", true);
        window.addEventListener("deviceorientation", (e) => this.handleRing(e));
      } catch {
        this.onBadge("ring", "\u{1F48D} \u4E0D\u652F\u6301", false);
      }
    };
    document.getElementById("ring-badge")?.addEventListener("click", enable, { once: true });
    if (typeof DeviceOrientationEvent.requestPermission !== "function") enable();
  }
  setupCane() {
    if (typeof DeviceMotionEvent === "undefined") return;
    this.onBadge("cane", "\u{1F9AF} \u70B9\u51FB\u542F\u7528", false);
    const enable = async () => {
      try {
        if (typeof DeviceMotionEvent.requestPermission === "function") {
          const perm = await DeviceMotionEvent.requestPermission();
          if (perm !== "granted") return;
        }
        this.caneActive = true;
        this.onBadge("cane", "\u{1F9AF} \u5DF2\u8FDE\u63A5", true);
        window.addEventListener("devicemotion", (e) => this.handleCane(e));
      } catch {
        this.onBadge("cane", "\u{1F9AF} \u4E0D\u652F\u6301", false);
      }
    };
    document.getElementById("cane-badge")?.addEventListener("click", enable, { once: true });
    if (typeof DeviceMotionEvent.requestPermission !== "function") enable();
  }
  handleRing(e) {
    if (!this.ringActive) return;
    this.ringFrame++;
    if (this.ringFrame % 8 !== 0) return;
    const beta = e.beta || 0;
    const gamma = e.gamma || 0;
    if (this.ringPrevBeta === null) {
      this.ringPrevBeta = beta;
      this.ringPrevGamma = gamma;
      return;
    }
    const dBeta = beta - this.ringPrevBeta;
    const dGamma = gamma - this.ringPrevGamma;
    const shake = Math.abs(dBeta) > 20 || Math.abs(dGamma) > 20;
    this.ringPrevBeta = beta;
    this.ringPrevGamma = gamma;
    if (shake) {
      this.onGesture("toggle_power");
      return;
    }
    if (Math.abs(dGamma) > 5) {
      this.onGesture(dGamma > 0 ? "next_device" : "prev_device");
      return;
    }
    if (Math.abs(dBeta) > 5) {
      this.onGesture(dBeta > 0 ? "power_on" : "power_off");
    }
  }
  handleCane(e) {
    if (!this.caneActive) return;
    this.caneFrame++;
    if (this.caneFrame % 6 !== 0) return;
    const a = e.accelerationIncludingGravity || e.acceleration || { x: 0, y: 0, z: 0 };
    const dax = Math.abs((a.x || 0) - this.caneLastAccel.x);
    const day = Math.abs((a.y || 0) - this.caneLastAccel.y);
    const daz = Math.abs((a.z || 0) - this.caneLastAccel.z);
    this.caneLastAccel = { x: a.x || 0, y: a.y || 0, z: a.z || 0 };
    if (dax > 8 || day > 8 || daz > 8) {
      this.onGesture("toggle_power");
      return;
    }
    const rot = e.rotationRate || { gamma: 0 };
    const gamma = rot.gamma || 0;
    if (this.canePrevGamma !== null && Math.abs(gamma - this.canePrevGamma) > 3) {
      this.onGesture(gamma > this.canePrevGamma ? "next_device" : "prev_device");
    }
    this.canePrevGamma = gamma;
  }
};
export {
  WearableInput
};
//# sourceMappingURL=wearable-input.js.map
