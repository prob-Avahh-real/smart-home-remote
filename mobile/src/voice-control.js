/**
 * Voice control — Web Speech API (zh-CN) command recognition
 */

const DEVICE_ALIASES = [
  { id: 'air_conditioner', names: ['空调', '冷气'] },
  { id: 'tv', names: ['电视', '电视机'] },
  { id: 'refrigerator', names: ['冰箱', '电冰箱'] },
  { id: 'range_hood', names: ['抽油烟机', '油烟机', '烟机'] },
  { id: 'washer', names: ['洗衣机'] },
  { id: 'water_heater', names: ['热水器'] },
];

const SCENE_ALIASES = [
  { id: 'home', names: ['回家模式', '回家', '到家模式'] },
  { id: 'sleep', names: ['睡眠模式', '睡觉模式', '睡眠'] },
  { id: 'cooking', names: ['烹饪模式', '做饭模式', '做菜模式', '烹饪'] },
  { id: 'away', names: ['离家模式', '出门模式', '外出模式', '离家'] },
];

/** @typedef {{ type: string, deviceId?: string, sceneId?: string, property?: string, value?: unknown, gesture?: string, label?: string }} VoiceAction */

/** @param {string} text @returns {VoiceAction | null} */
export function parseVoiceCommand(text) {
  const t = text.replace(/\s+/g, '').trim();
  if (!t) return null;

  // Scenes
  for (const s of SCENE_ALIASES) {
    for (const name of s.names) {
      if (t.includes(name)) {
        return { type: 'scene', sceneId: s.id, label: name };
      }
    }
  }

  // Global commands
  if (/全部关闭|全都关闭|关闭全部|关闭所有|全关/.test(t)) {
    return { type: 'scene', sceneId: 'away', label: '全部关闭' };
  }
  if (/下一个设备|下一台|下一个/.test(t)) {
    return { type: 'gesture', gesture: 'next_device', label: '下一个设备' };
  }
  if (/上一个设备|上一台|上一个/.test(t)) {
    return { type: 'gesture', gesture: 'prev_device', label: '上一个设备' };
  }

  // Temperature: 空调调到26度 / 冰箱调到4度 / 热水器42度
  const tempMatch = t.match(/(\d+)\s*度/);
  if (tempMatch) {
    const temp = Number(tempMatch[1]);
    if (/冰箱|冷藏/.test(t)) {
      return { type: 'set', deviceId: 'refrigerator', property: 'fridge_temp', value: temp, label: `冰箱 ${temp}°C` };
    }
    if (/冷冻/.test(t)) {
      return { type: 'set', deviceId: 'refrigerator', property: 'freezer_temp', value: temp, label: `冷冻 ${temp}°C` };
    }
    if (/热水器|热水/.test(t)) {
      return { type: 'set', deviceId: 'water_heater', property: 'temperature', value: temp, label: `热水器 ${temp}°C` };
    }
    if (/空调|冷气/.test(t) || t.includes('调')) {
      return { type: 'set', deviceId: 'air_conditioner', property: 'temperature', value: temp, label: `空调 ${temp}°C` };
    }
  }

  // Device power on/off
  const powerOn = /打开|开启|启动|开/.test(t);
  const powerOff = /关闭|关掉|关|停止/.test(t);

  for (const d of DEVICE_ALIASES) {
    for (const name of d.names) {
      if (!t.includes(name)) continue;
      if (powerOn && !powerOff) {
        return { type: 'power', deviceId: d.id, value: true, label: `打开${name}` };
      }
      if (powerOff && !powerOn) {
        return { type: 'power', deviceId: d.id, value: false, label: `关闭${name}` };
      }
      if (/切换|开关/.test(t)) {
        return { type: 'toggle', deviceId: d.id, label: `切换${name}` };
      }
    }
  }

  return null;
}

export class VoiceControl {
  /** @param {{ onAction: (action: VoiceAction) => void, onStatus?: (status: string, listening?: boolean) => void }} opts */
  constructor(opts) {
    this.onAction = opts.onAction;
    this.onStatus = opts.onStatus ?? (() => {});
    /** @type {SpeechRecognition | null} */
    this.recognition = null;
    this.listening = false;
    this.supported = false;
    this.lastCommand = '';
    this.continuous = false;
  }

  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.onStatus('当前浏览器不支持语音识别', false);
      return;
    }

    this.supported = true;
    this.recognition = new SR();
    this.recognition.lang = 'zh-CN';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.listening = true;
      this.onStatus('正在聆听…', true);
    };

    this.recognition.onend = () => {
      this.listening = false;
      if (this.continuous) {
        try { this.recognition.start(); } catch { /* already started */ }
      } else {
        this.onStatus(this.lastCommand ? `已识别: ${this.lastCommand}` : '点击麦克风开始', false);
      }
    };

    this.recognition.onerror = (e) => {
      this.listening = false;
      const msg = {
        'not-allowed': '请允许麦克风权限',
        'service-not-allowed': '语音识别不可用（iOS 需 HTTPS）',
        'no-speech': '未检测到语音',
        'aborted': '已停止',
        'network': '网络错误',
      }[e.error] || `识别错误: ${e.error}`;
      this.onStatus(msg, false);
    };

    this.recognition.onresult = (e) => {
      const text = e.results[e.results.length - 1][0].transcript;
      this.lastCommand = text;
      this.onStatus(`识别: ${text}`, true);
      const action = parseVoiceCommand(text);
      if (action) {
        this.onAction(action);
      } else {
        this.onStatus(`未理解: ${text}`, false);
      }
    };

    this.onStatus('点击麦克风开始', false);
  }

  toggle() {
    if (!this.supported || !this.recognition) {
      this.onStatus('当前浏览器不支持语音识别', false);
      return;
    }
    if (this.listening) {
      this.continuous = false;
      this.recognition.stop();
      return;
    }
    this.continuous = true;
    try {
      this.recognition.start();
    } catch {
      this.onStatus('无法启动语音识别', false);
    }
  }

  stop() {
    this.continuous = false;
    if (this.recognition && this.listening) {
      this.recognition.stop();
    }
  }
}
