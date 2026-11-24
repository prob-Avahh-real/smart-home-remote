import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.js';

describe('Store', () => {
  it('starts with devices and scenes', () => {
    const store = new Store();
    assert.ok(store.devices.length > 0);
    assert.ok(store.getSceneList().length > 0);
  });

  it('toggles power on a device', () => {
    const store = new Store();
    const id = store.devices[0].id;
    const before = store.devices[0].state.power;
    store.togglePower(id);
    assert.notEqual(store.getDevice(id).state.power, before);
  });
});
