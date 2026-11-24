// src/voice-control.js
var DEVICE_ALIASES = [
  { id: "air_conditioner", names: ["\u7A7A\u8C03", "\u51B7\u6C14"] },
  { id: "tv", names: ["\u7535\u89C6", "\u7535\u89C6\u673A"] },
  { id: "refrigerator", names: ["\u51B0\u7BB1", "\u7535\u51B0\u7BB1"] },
  { id: "range_hood", names: ["\u62BD\u6CB9\u70DF\u673A", "\u6CB9\u70DF\u673A", "\u70DF\u673A"] },
  { id: "washer", names: ["\u6D17\u8863\u673A"] },
  { id: "water_heater", names: ["\u70ED\u6C34\u5668"] }
];
var SCENE_ALIASES = [
  { id: "home", names: ["\u56DE\u5BB6\u6A21\u5F0F", "\u56DE\u5BB6", "\u5230\u5BB6\u6A21\u5F0F"] },
  { id: "sleep", names: ["\u7761\u7720\u6A21\u5F0F", "\u7761\u89C9\u6A21\u5F0F", "\u7761\u7720"] },
  { id: "cooking", names: ["\u70F9\u996A\u6A21\u5F0F", "\u505A\u996D\u6A21\u5F0F", "\u505A\u83DC\u6A21\u5F0F", "\u70F9\u996A"] },
  { id: "away", names: ["\u79BB\u5BB6\u6A21\u5F0F", "\u51FA\u95E8\u6A21\u5F0F", "\u5916\u51FA\u6A21\u5F0F", "\u79BB\u5BB6"] }
];
function parseVoiceCommand(text) {
  const t = text.replace(/\s+/g, "").trim();
  if (!t) return null;
  for (const s of SCENE_ALIASES) {
    for (const name of s.names) {
      if (t.includes(name)) {
        return { type: "scene", sceneId: s.id, label: name };
      }
    }
  }
  if (/全部关闭|全都关闭|关闭全部|关闭所有|全关/.test(t)) {
    return { type: "scene", sceneId: "away", label: "\u5168\u90E8\u5173\u95ED" };
  }
  if (/下一个设备|下一台|下一个/.test(t)) {
    return { type: "gesture", gesture: "next_device", label: "\u4E0B\u4E00\u4E2A\u8BBE\u5907" };
  }
  if (/上一个设备|上一台|上一个/.test(t)) {
    return { type: "gesture", gesture: "prev_device", label: "\u4E0A\u4E00\u4E2A\u8BBE\u5907" };
  }
  const tempMatch = t.match(/(\d+)\s*度/);
  if (tempMatch) {
    const temp = Number(tempMatch[1]);
    if (/冰箱|冷藏/.test(t)) {
      return { type: "set", deviceId: "refrigerator", property: "fridge_temp", value: temp, label: `\u51B0\u7BB1 ${temp}\xB0C` };
    }
    if (/冷冻/.test(t)) {
      return { type: "set", deviceId: "refrigerator", property: "freezer_temp", value: temp, label: `\u51B7\u51BB ${temp}\xB0C` };
    }
    if (/热水器|热水/.test(t)) {
      return { type: "set", deviceId: "water_heater", property: "temperature", value: temp, label: `\u70ED\u6C34\u5668 ${temp}\xB0C` };
    }
    if (/空调|冷气/.test(t) || t.includes("\u8C03")) {
      return { type: "set", deviceId: "air_conditioner", property: "temperature", value: temp, label: `\u7A7A\u8C03 ${temp}\xB0C` };
    }
  }
  const powerOn = /打开|开启|启动|开/.test(t);
  const powerOff = /关闭|关掉|关|停止/.test(t);
  for (const d of DEVICE_ALIASES) {
    for (const name of d.names) {
      if (!t.includes(name)) continue;
      if (powerOn && !powerOff) {
        return { type: "power", deviceId: d.id, value: true, label: `\u6253\u5F00${name}` };
      }
      if (powerOff && !powerOn) {
        return { type: "power", deviceId: d.id, value: false, label: `\u5173\u95ED${name}` };
      }
      if (/切换|开关/.test(t)) {
        return { type: "toggle", deviceId: d.id, label: `\u5207\u6362${name}` };
      }
    }
  }
  return null;
}
var VoiceControl = class {
  /** @param {{ onAction: (action: VoiceAction) => void, onStatus?: (status: string, listening?: boolean) => void }} opts */
  constructor(opts) {
    this.onAction = opts.onAction;
    this.onStatus = opts.onStatus ?? (() => {
    });
    this.recognition = null;
    this.listening = false;
    this.supported = false;
    this.lastCommand = "";
    this.continuous = false;
  }
  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.onStatus("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B", false);
      return;
    }
    this.supported = true;
    this.recognition = new SR();
    this.recognition.lang = "zh-CN";
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.onstart = () => {
      this.listening = true;
      this.onStatus("\u6B63\u5728\u8046\u542C\u2026", true);
    };
    this.recognition.onend = () => {
      this.listening = false;
      if (this.continuous) {
        try {
          this.recognition.start();
        } catch {
        }
      } else {
        this.onStatus(this.lastCommand ? `\u5DF2\u8BC6\u522B: ${this.lastCommand}` : "\u70B9\u51FB\u9EA6\u514B\u98CE\u5F00\u59CB", false);
      }
    };
    this.recognition.onerror = (e) => {
      this.listening = false;
      const msg = {
        "not-allowed": "\u8BF7\u5141\u8BB8\u9EA6\u514B\u98CE\u6743\u9650",
        "service-not-allowed": "\u8BED\u97F3\u8BC6\u522B\u4E0D\u53EF\u7528\uFF08iOS \u9700 HTTPS\uFF09",
        "no-speech": "\u672A\u68C0\u6D4B\u5230\u8BED\u97F3",
        "aborted": "\u5DF2\u505C\u6B62",
        "network": "\u7F51\u7EDC\u9519\u8BEF"
      }[e.error] || `\u8BC6\u522B\u9519\u8BEF: ${e.error}`;
      this.onStatus(msg, false);
    };
    this.recognition.onresult = (e) => {
      const text = e.results[e.results.length - 1][0].transcript;
      this.lastCommand = text;
      this.onStatus(`\u8BC6\u522B: ${text}`, true);
      const action = parseVoiceCommand(text);
      if (action) {
        this.onAction(action);
      } else {
        this.onStatus(`\u672A\u7406\u89E3: ${text}`, false);
      }
    };
    this.onStatus("\u70B9\u51FB\u9EA6\u514B\u98CE\u5F00\u59CB", false);
  }
  toggle() {
    if (!this.supported || !this.recognition) {
      this.onStatus("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BED\u97F3\u8BC6\u522B", false);
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
      this.onStatus("\u65E0\u6CD5\u542F\u52A8\u8BED\u97F3\u8BC6\u522B", false);
    }
  }
  stop() {
    this.continuous = false;
    if (this.recognition && this.listening) {
      this.recognition.stop();
    }
  }
};
export {
  VoiceControl,
  parseVoiceCommand
};
//# sourceMappingURL=voice-control.js.map
