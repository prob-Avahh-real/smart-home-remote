import mqtt from 'mqtt';

const PREFIX = 'smarthome';

/** @param {string} room @param {string} deviceId @param {string} property */
export function topicState(room, deviceId, property) {
  return `${PREFIX}/${room}/${deviceId}/${property}/state`;
}

/** @param {string} room @param {string} deviceId @param {string} property */
export function topicCommand(room, deviceId, property) {
  return `${PREFIX}/${room}/${deviceId}/${property}/command`;
}

export class MqttBridge {
  /** @param {{ onState?: Function, onStatus?: Function }} handlers */
  constructor(handlers = {}) {
    this.handlers = handlers;
    /** @type {import('mqtt').MqttClient | null} */
    this.client = null;
    this.connected = false;
    /** @type {import('./store.js').Store | null} */
    this.store = null;
  }

  /** @param {string} brokerUrl @param {import('./store.js').Store} store */
  connect(brokerUrl, store) {
    this.store = store;
    this.disconnect();

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(brokerUrl, {
        reconnectPeriod: 3000,
        connectTimeout: 8000,
      });

      this.client.on('connect', () => {
        this.connected = true;
        const topics = store.devices.flatMap((d) =>
          Object.keys(d.state).map((prop) => topicState(d.room, d.id, prop))
        );
        this.client.subscribe(topics);
        this.handlers.onStatus?.('mqtt-connected');
        resolve();
      });

      this.client.on('error', (err) => {
        this.handlers.onStatus?.(`mqtt-error: ${err.message}`);
        reject(err);
      });

      this.client.on('message', (topic, payload) => {
        const msg = payload.toString();
        const parts = topic.split('/');
        if (parts.length < 5) return;
        const [, room, deviceId, property] = parts;
        const device = store.devices.find((d) => d.id === deviceId && d.room === room);
        if (!device || !(property in device.state)) return;

        let value = msg;
        if (msg === 'true' || msg === 'false') value = msg === 'true';
        else if (msg === 'ON' || msg === 'OFF') value = msg === 'ON';
        else if (!Number.isNaN(Number(msg)) && msg.trim() !== '') value = Number(msg);

        device.state[property] = value;
        this.handlers.onState?.(deviceId, property, value);
      });
    });
  }

  /** @param {import('./devices.js').DeviceDef} device @param {string} property @param {unknown} value */
  publishCommand(device, property, value) {
    if (!this.client?.connected) return false;
    let payload = String(value);
    if (typeof value === 'boolean') payload = value ? 'ON' : 'OFF';
    this.client.publish(topicCommand(device.room, device.id, property), payload);
    return true;
  }

  disconnect() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this.connected = false;
  }
}
