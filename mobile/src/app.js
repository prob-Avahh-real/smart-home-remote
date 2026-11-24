import {
  ROOMS,
  deviceSummary,
  FAN_SPEEDS,
  AC_MODES,
  AC_FAN_SPEEDS,
  WASHER_PROGRAMS,
  TV_INPUTS,
} from './devices.js';
import { Store } from './store.js';
import { MqttBridge } from './mqtt-bridge.js';
import { Simulator } from './simulator.js';
import { WearableInput } from './wearable-input.js';
import { VoiceControl } from './voice-control.js';
import { GestureControl } from './gesture-control.js';

const $ = (id) => document.getElementById(id);

const store = new Store();
let bridge = null;
let simulator = new Simulator({
  onStatus: (s) => store.setConnection('simulator', s),
});

const wearable = new WearableInput({
  onGesture: handleGesture,
  onBadge: updateBadge,
});

const voice = new VoiceControl({
  onAction: handleVoiceAction,
  onStatus: (status, listening) => {
    const el = $('voice-status');
    const btn = $('voice-btn');
    if (el) {
      el.textContent = status;
      el.classList.toggle('listening', !!listening);
    }
    if (btn) btn.classList.toggle('listening', !!listening);
  },
});

const gesture = new GestureControl({
  onGesture: handleGesture,
  onStatus: (status, active) => {
    updateBadge('gesture', active ? '🤚 识别中' : '🤚 手势', !!active);
    const preview = $('gesture-preview');
    const label = $('gesture-label');
    if (preview) preview.classList.toggle('active', !!active);
    if (label) label.textContent = status;
  },
});

function updateBadge(kind, text, active) {
  const el = $(`${kind}-badge`);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('active', active);
  el.style.display = 'flex';
}

function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 1800);
}

function sendProperty(deviceId, key, value) {
  const device = store.getDevice(deviceId);
  if (!device) return;
  store.setProperty(deviceId, key, value);
  if (bridge?.connected) bridge.publishCommand(device, key, value);
  else simulator.applyLocal(device, key, value);
}

function handleGesture(gesture) {
  const focused = store.selectedDeviceId || store.devices[0]?.id;
  switch (gesture) {
    case 'prev_device':
      store.cycleSelectedDevice(-1);
      showToast(`切换: ${store.getDevice(store.selectedDeviceId)?.label}`);
      break;
    case 'next_device':
      store.cycleSelectedDevice(1);
      showToast(`切换: ${store.getDevice(store.selectedDeviceId)?.label}`);
      break;
    case 'power_on':
      if (focused) sendProperty(focused, 'power', true);
      showToast('已开启');
      break;
    case 'power_off':
      if (focused) sendProperty(focused, 'power', false);
      showToast('已关闭');
      break;
    case 'toggle_power':
      if (focused) {
        store.togglePower(focused);
        const d = store.getDevice(focused);
        if (bridge?.connected) bridge.publishCommand(d, 'power', d.state.power);
        else simulator.applyLocal(d, 'power', d.state.power);
        showToast(d.state.power ? '已开启' : '已关闭');
      }
      break;
    default:
      break;
  }
}

/** @param {import('./voice-control.js').VoiceAction} action */
function handleVoiceAction(action) {
  $('voice-last').textContent = action.label || '已执行';
  switch (action.type) {
    case 'gesture':
      if (action.gesture) handleGesture(action.gesture);
      break;
    case 'scene':
      if (action.sceneId) applyScene(action.sceneId);
      break;
    case 'power':
      if (action.deviceId) {
        sendProperty(action.deviceId, 'power', action.value);
        showToast(action.label || (action.value ? '已开启' : '已关闭'));
      }
      break;
    case 'toggle':
      if (action.deviceId) {
        store.togglePower(action.deviceId);
        const d = store.getDevice(action.deviceId);
        if (bridge?.connected) bridge.publishCommand(d, 'power', d.state.power);
        else simulator.applyLocal(d, 'power', d.state.power);
        showToast(action.label || '已切换');
      }
      break;
    case 'set':
      if (action.deviceId && action.property) {
        sendProperty(action.deviceId, action.property, action.value);
        if (action.property === 'temperature' || action.property.includes('temp')) {
          sendProperty(action.deviceId, 'power', true);
        }
        showToast(action.label || '已设置');
      }
      break;
    default:
      break;
  }
}

function deviceCardHtml(device) {
  const on = device.state.power === true;
  return `
    <div class="device-card ${on ? 'on' : ''}" data-device="${device.id}">
      <div class="power-dot"></div>
      <div class="icon">${device.icon}</div>
      <div class="name">${device.label}</div>
      <div class="summary">${deviceSummary(device.type, device.state)}</div>
    </div>`;
}

function renderHome() {
  $('home-devices').innerHTML = store.devices.map(deviceCardHtml).join('');
  $('home-scenes').innerHTML = store.getSceneList().map((s) => `
    <div class="scene-card" data-scene="${s.id}">
      <div class="icon">${s.icon}</div>
      <div class="name">${s.label}</div>
      <div class="desc">${s.desc}</div>
    </div>`).join('');
}

function renderRooms() {
  $('room-tabs').innerHTML = [
    `<button class="room-tab ${store.selectedRoom === 'all' ? 'active' : ''}" data-room="all">全部</button>`,
    ...ROOMS.map((r) =>
      `<button class="room-tab ${store.selectedRoom === r.id ? 'active' : ''}" data-room="${r.id}">${r.icon} ${r.label}</button>`
    ),
  ].join('');
  $('room-devices').innerHTML = store.filteredDevices().map(deviceCardHtml).join('');
}

function renderScenes() {
  $('scene-list').innerHTML = store.getSceneList().map((s) => `
    <div class="scene-card" data-scene="${s.id}">
      <div class="icon">${s.icon}</div>
      <div class="name">${s.label}</div>
      <div class="desc">${s.desc}</div>
    </div>`).join('');
}

function renderStats() {
  $('stat-active').textContent = String(store.activeDeviceCount());
  $('stat-total').textContent = String(store.devices.length);
  $('stat-mode').textContent = store.connectionMode === 'mqtt' ? 'MQTT' : '模拟';
  $('conn-status').textContent = store.connectionStatus;
}

function renderTabs() {
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  $(`panel-${store.activeTab}`)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((n) => {
    n.classList.toggle('active', n.dataset.tab === store.activeTab);
  });
}

function toggleHtml(id, key, value, label, hint = '') {
  return `
    <div class="ctrl-row">
      <div>
        <div class="ctrl-label">${label}</div>
        ${hint ? `<div class="ctrl-hint">${hint}</div>` : ''}
      </div>
      <button class="toggle ${value ? 'on' : ''}" data-toggle="${id}:${key}"></button>
    </div>`;
}

function stepsHtml(id, key, options, current, label) {
  return `
    <div class="ctrl-row" style="flex-direction:column;align-items:stretch;">
      <div class="ctrl-label">${label}</div>
      <div class="step-btns">
        ${options.map((o) =>
          `<button class="step-btn ${o.value === current ? 'active' : ''}" data-step="${id}:${key}:${o.value}">${o.label}</button>`
        ).join('')}
      </div>
    </div>`;
}

function rangeHtml(id, key, value, min, max, step, label, unit = '') {
  return `
    <div class="ctrl-row" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="ctrl-label">${label}</div>
        <div class="range-val" id="range-val-${id}-${key}">${value}${unit}</div>
      </div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}"
        data-range="${id}:${key}" data-unit="${unit}">
    </div>`;
}

function renderDetail(device) {
  const s = device.state;
  let controls = '';

  if (s.power !== undefined) {
    controls += toggleHtml(device.id, 'power', s.power, '电源');
  }

  switch (device.type) {
    case 'range_hood':
      controls += stepsHtml(device.id, 'fan_speed', FAN_SPEEDS, s.fan_speed, '风速');
      controls += toggleHtml(device.id, 'light', s.light, '照明灯');
      break;
    case 'air_conditioner':
      controls += rangeHtml(device.id, 'temperature', s.temperature, 16, 30, 1, '目标温度', '°C');
      controls += stepsHtml(device.id, 'mode', AC_MODES, s.mode, '模式');
      controls += stepsHtml(device.id, 'fan_speed', AC_FAN_SPEEDS, s.fan_speed, '风速');
      break;
    case 'refrigerator':
      controls += rangeHtml(device.id, 'fridge_temp', s.fridge_temp, 2, 8, 1, '冷藏温度', '°C');
      controls += rangeHtml(device.id, 'freezer_temp', s.freezer_temp, -24, -12, 1, '冷冻温度', '°C');
      controls += toggleHtml(device.id, 'ice_maker', s.ice_maker, '制冰机');
      break;
    case 'tv':
      controls += rangeHtml(device.id, 'volume', s.volume, 0, 100, 1, '音量');
      controls += rangeHtml(device.id, 'channel', s.channel, 1, 99, 1, '频道');
      controls += stepsHtml(device.id, 'input', TV_INPUTS, s.input, '信号源');
      break;
    case 'washer':
      controls += stepsHtml(device.id, 'program', WASHER_PROGRAMS, s.program, '洗涤程序');
      controls += `<div class="ctrl-row"><div class="ctrl-label">状态</div><div class="range-val">${s.status === 'running' ? '运行中' : '待机'}</div></div>`;
      break;
    case 'water_heater':
      controls += rangeHtml(device.id, 'temperature', s.temperature, 35, 75, 1, '水温', '°C');
      break;
    default:
      break;
  }

  $('detail-sheet').innerHTML = `
    <div class="detail-header">
      <div class="icon">${device.icon}</div>
      <div>
        <div class="title">${device.label}</div>
        <div class="ctrl-hint">${ROOMS.find((r) => r.id === device.room)?.label ?? device.room}</div>
      </div>
      <button class="close" id="detail-close">✕</button>
    </div>
    ${controls}`;

  $('detail-overlay').classList.add('open');
}

function closeDetail() {
  $('detail-overlay').classList.remove('open');
  store.selectDevice(null);
}

function applyScene(sceneId) {
  store.applyScene(sceneId);
  const scene = store.getSceneList().find((s) => s.id === sceneId);
  showToast(`已启用 ${scene?.label ?? sceneId}`);
  for (const d of store.devices) {
    if (bridge?.connected) {
      for (const [key, val] of Object.entries(d.state)) {
        bridge.publishCommand(d, key, val);
      }
    }
  }
}

function render() {
  renderStats();
  renderTabs();
  renderHome();
  renderRooms();
  renderScenes();
}

async function connectMqtt() {
  const broker = $('mqtt-broker').value.trim();
  bridge?.disconnect();
  simulator.disconnect();
  bridge = new MqttBridge({
    onState: () => store.notify(),
    onStatus: (s) => store.setConnection('mqtt', s),
  });
  try {
    await bridge.connect(broker, store);
  } catch {
    store.setConnection('simulator', 'mqtt-failed → 模拟器');
    bridge.disconnect();
    bridge = null;
    simulator = new Simulator({ onStatus: (s) => store.setConnection('simulator', s) });
    await simulator.connect();
  }
}

function useSimulator() {
  bridge?.disconnect();
  bridge = null;
  simulator.disconnect();
  simulator = new Simulator({ onStatus: (s) => store.setConnection('simulator', s) });
  simulator.connect();
}

document.querySelector('.bottom-nav').addEventListener('click', (e) => {
  const tab = e.target.closest('.nav-item')?.dataset.tab;
  if (tab) store.setTab(tab);
});

document.addEventListener('click', (e) => {
  const card = e.target.closest('[data-device]');
  if (card) {
    const id = card.dataset.device;
    store.selectDevice(id);
    renderDetail(store.getDevice(id));
    return;
  }

  const scene = e.target.closest('[data-scene]');
  if (scene) {
    applyScene(scene.dataset.scene);
    return;
  }

  const roomTab = e.target.closest('[data-room]');
  if (roomTab) {
    store.setRoom(roomTab.dataset.room);
    return;
  }

  if (e.target.id === 'detail-close' || e.target.id === 'detail-overlay') {
    closeDetail();
    return;
  }

  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    const [id, key] = toggle.dataset.toggle.split(':');
    const device = store.getDevice(id);
    const next = !device.state[key];
    sendProperty(id, key, next);
    renderDetail(store.getDevice(id));
    return;
  }

  const step = e.target.closest('[data-step]');
  if (step) {
    const [id, key, val] = step.dataset.step.split(':');
    let parsed = val;
    if (val === 'true' || val === 'false') parsed = val === 'true';
    else if (!Number.isNaN(Number(val)) && key !== 'input' && key !== 'mode' && key !== 'program' && key !== 'fan_speed') {
      parsed = Number(val);
    } else if (key === 'fan_speed' && !Number.isNaN(Number(val))) {
      parsed = Number(val);
    }
    sendProperty(id, key, parsed);
    renderDetail(store.getDevice(id));
    return;
  }
});

document.addEventListener('input', (e) => {
  const range = e.target.closest('[data-range]');
  if (!range) return;
  const [id, key] = range.dataset.range.split(':');
  const val = Number(range.value);
  const unit = range.dataset.unit || '';
  $(`range-val-${id}-${key}`).textContent = `${val}${unit}`;
  sendProperty(id, key, val);
});

$('btn-mqtt').addEventListener('click', connectMqtt);
$('btn-sim').addEventListener('click', useSimulator);
$('voice-btn').addEventListener('click', () => voice.toggle());
$('gesture-badge').addEventListener('click', () => gesture.toggle());

store.subscribe(render);
wearable.setupRing();
wearable.setupCane();
gesture.bindElements('gesture-video', 'gesture-canvas');
updateBadge('gesture', '🤚 手势', false);
voice.init();
useSimulator();
render();

export {};
