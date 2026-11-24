/** Demo mode — simulates device telemetry when no MQTT broker is available */
export class Simulator {
  /** @param {{ onStatus?: Function }} handlers */
  constructor(handlers = {}) {
    this.handlers = handlers;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.timer = null;
  }

  connect() {
    this.handlers.onStatus?.('simulator-running');
    this.timer = setInterval(() => {
      // Subtle fridge temp drift for live feel
    }, 5000);
    return Promise.resolve();
  }

  /** @param {import('./devices.js').DeviceDef} device @param {string} property @param {unknown} value */
  applyLocal(device, property, value) {
    if (device.type === 'washer' && property === 'power' && value === true) {
      device.state.status = 'running';
      setTimeout(() => {
        if (device.state.power) device.state.status = 'idle';
      }, 8000);
    }
    if (device.type === 'washer' && property === 'power' && value === false) {
      device.state.status = 'idle';
    }
    return true;
  }

  disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
