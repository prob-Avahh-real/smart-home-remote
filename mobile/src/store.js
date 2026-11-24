import { createDefaultDevices, SCENES } from './devices.js';

export class Store {
  constructor() {
    /** @type {import('./devices.js').DeviceDef[]} */
    this.devices = createDefaultDevices();
    this.activeTab = 'home';
    this.selectedRoom = 'all';
    this.selectedDeviceId = null;
    this.connectionMode = 'simulator';
    this.connectionStatus = 'simulator-running';
    this.listeners = new Set();
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
    if (!device || device.state.power === undefined) return;
    this.setProperty(id, 'power', !device.state.power);
  }

  /** @param {string} sceneId */
  applyScene(sceneId) {
    switch (sceneId) {
      case 'home':
        this.patchDevice('air_conditioner', { power: true, temperature: 26, mode: 'cool' });
        this.patchDevice('tv', { power: false });
        this.patchDevice('range_hood', { light: true });
        break;
      case 'sleep':
        this.patchDevice('air_conditioner', { power: true, temperature: 26, mode: 'cool', fan_speed: 'low' });
        this.patchDevice('tv', { power: false });
        this.patchDevice('range_hood', { power: false, fan_speed: 0, light: false });
        this.patchDevice('water_heater', { power: false });
        break;
      case 'cooking':
        this.patchDevice('range_hood', { power: true, fan_speed: 3, light: true });
        break;
      case 'away':
        for (const d of this.devices) {
          if (d.type === 'refrigerator') continue;
          if (d.state.power !== undefined) d.state.power = false;
          if (d.type === 'range_hood') {
            d.state.fan_speed = 0;
            d.state.light = false;
          }
          if (d.type === 'washer') d.state.status = 'idle';
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
    if (tab !== 'rooms') this.selectedDeviceId = null;
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
    if (this.selectedRoom === 'all') return this.devices;
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
    this.activeTab = 'rooms';
    this.notify();
  }
}
