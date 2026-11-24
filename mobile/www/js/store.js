// src/devices.js
function createDefaultDevices() {
  return [
    {
      id: "range_hood",
      type: "range_hood",
      label: "\u62BD\u6CB9\u70DF\u673A",
      icon: "\u{1F300}",
      room: "kitchen",
      state: { power: false, fan_speed: 0, light: false }
    },
    {
      id: "air_conditioner",
      type: "air_conditioner",
      label: "\u7A7A\u8C03",
      icon: "\u2744\uFE0F",
      room: "living",
      state: { power: false, temperature: 26, mode: "cool", fan_speed: "auto" }
    },
    {
      id: "refrigerator",
      type: "refrigerator",
      label: "\u51B0\u7BB1",
      icon: "\u{1F9CA}",
      room: "kitchen",
      state: { power: true, fridge_temp: 4, freezer_temp: -18, ice_maker: true }
    },
    {
      id: "tv",
      type: "tv",
      label: "\u7535\u89C6",
      icon: "\u{1F4FA}",
      room: "living",
      state: { power: false, volume: 35, channel: 1, input: "hdmi1" }
    },
    {
      id: "washer",
      type: "washer",
      label: "\u6D17\u8863\u673A",
      icon: "\u{1FAE7}",
      room: "laundry",
      state: { power: false, program: "standard", status: "idle" }
    },
    {
      id: "water_heater",
      type: "water_heater",
      label: "\u70ED\u6C34\u5668",
      icon: "\u{1F525}",
      room: "bathroom",
      state: { power: true, temperature: 42 }
    }
  ];
}
var SCENES = [
  { id: "home", label: "\u56DE\u5BB6\u6A21\u5F0F", icon: "\u{1F3E0}", desc: "\u5F00\u7A7A\u8C03\u3001\u5F00\u706F\u3001\u5173\u7535\u89C6" },
  { id: "sleep", label: "\u7761\u7720\u6A21\u5F0F", icon: "\u{1F319}", desc: "\u7A7A\u8C03 26\xB0C\u3001\u5173\u95ED\u5176\u4ED6\u8BBE\u5907" },
  { id: "cooking", label: "\u70F9\u996A\u6A21\u5F0F", icon: "\u{1F468}\u200D\u{1F373}", desc: "\u6CB9\u70DF\u673A\u9AD8\u6863\u3001\u5F00\u7167\u660E" },
  { id: "away", label: "\u79BB\u5BB6\u6A21\u5F0F", icon: "\u{1F6AA}", desc: "\u5173\u95ED\u5168\u90E8\u53EF\u63A7\u8BBE\u5907" }
];

// src/store.js
var Store = class {
  constructor() {
    this.devices = createDefaultDevices();
    this.activeTab = "home";
    this.selectedRoom = "all";
    this.selectedDeviceId = null;
    this.connectionMode = "simulator";
    this.connectionStatus = "simulator-running";
    this.listeners = /* @__PURE__ */ new Set();
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  notify() {
    for (const fn of this.listeners) fn(this);
  }
  /** @param {string} id */
  getDevice(id) {
    return this.devices.find((d) => d.id === id);
  }
  /** @param {string} id @param {string} key @param {unknown} value */
  setProperty(id, key, value) {
    const device = this.getDevice(id);
    if (!device) return;
    device.state[key] = value;
    this.notify();
  }
  /** @param {string} id @param {Record<string, unknown>} patch */
  patchDevice(id, patch) {
    const device = this.getDevice(id);
    if (!device) return;
    Object.assign(device.state, patch);
    this.notify();
  }
  /** @param {string} id */
  togglePower(id) {
    const device = this.getDevice(id);
    if (!device || device.state.power === void 0) return;
    this.setProperty(id, "power", !device.state.power);
  }
  /** @param {string} sceneId */
  applyScene(sceneId) {
    switch (sceneId) {
      case "home":
        this.patchDevice("air_conditioner", { power: true, temperature: 26, mode: "cool" });
        this.patchDevice("tv", { power: false });
        this.patchDevice("range_hood", { light: true });
        break;
      case "sleep":
        this.patchDevice("air_conditioner", { power: true, temperature: 26, mode: "cool", fan_speed: "low" });
        this.patchDevice("tv", { power: false });
        this.patchDevice("range_hood", { power: false, fan_speed: 0, light: false });
        this.patchDevice("water_heater", { power: false });
        break;
      case "cooking":
        this.patchDevice("range_hood", { power: true, fan_speed: 3, light: true });
        break;
      case "away":
        for (const d of this.devices) {
          if (d.type === "refrigerator") continue;
          if (d.state.power !== void 0) d.state.power = false;
          if (d.type === "range_hood") {
            d.state.fan_speed = 0;
            d.state.light = false;
          }
          if (d.type === "washer") d.state.status = "idle";
        }
        break;
      default:
        break;
    }
    this.notify();
  }
  /** @param {string} tab */
  setTab(tab) {
    this.activeTab = tab;
    if (tab !== "rooms") this.selectedDeviceId = null;
    this.notify();
  }
  /** @param {string} roomId */
  setRoom(roomId) {
    this.selectedRoom = roomId;
    this.notify();
  }
  /** @param {string|null} deviceId */
  selectDevice(deviceId) {
    this.selectedDeviceId = deviceId;
    this.notify();
  }
  /** @param {string} mode @param {string} status */
  setConnection(mode, status) {
    this.connectionMode = mode;
    this.connectionStatus = status;
    this.notify();
  }
  /** @returns {import('./devices.js').DeviceDef[]} */
  filteredDevices() {
    if (this.selectedRoom === "all") return this.devices;
    return this.devices.filter((d) => d.room === this.selectedRoom);
  }
  /** @returns {number} */
  activeDeviceCount() {
    return this.devices.filter((d) => d.state.power === true).length;
  }
  getSceneList() {
    return SCENES;
  }
  /** @param {number} delta */
  cycleSelectedDevice(delta) {
    const list = this.filteredDevices();
    if (!list.length) return;
    let idx = list.findIndex((d) => d.id === this.selectedDeviceId);
    if (idx < 0) idx = 0;
    else idx = (idx + delta + list.length) % list.length;
    this.selectedDeviceId = list[idx].id;
    this.activeTab = "rooms";
    this.notify();
  }
};
export {
  Store
};
//# sourceMappingURL=store.js.map
