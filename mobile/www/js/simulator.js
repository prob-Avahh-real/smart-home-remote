// src/simulator.js
var Simulator = class {
  /** @param {{ onStatus?: Function }} handlers */
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.timer = null;
  }
  connect() {
    this.handlers.onStatus?.("simulator-running");
    this.timer = setInterval(() => {
    }, 5e3);
    return Promise.resolve();
  }
  /** @param {import('./devices.js').DeviceDef} device @param {string} property @param {unknown} value */
  applyLocal(device, property, value) {
    if (device.type === "washer" && property === "power" && value === true) {
      device.state.status = "running";
      setTimeout(() => {
        if (device.state.power) device.state.status = "idle";
      }, 8e3);
    }
    if (device.type === "washer" && property === "power" && value === false) {
      device.state.status = "idle";
    }
    return true;
  }
  disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
};
export {
  Simulator
};
//# sourceMappingURL=simulator.js.map
