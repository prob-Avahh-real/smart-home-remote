// src/devices.js
var ROOMS = [
  { id: "living", label: "\u5BA2\u5385", icon: "\u{1F6CB}\uFE0F" },
  { id: "kitchen", label: "\u53A8\u623F", icon: "\u{1F373}" },
  { id: "bedroom", label: "\u5367\u5BA4", icon: "\u{1F6CF}\uFE0F" },
  { id: "bathroom", label: "\u536B\u751F\u95F4", icon: "\u{1F6BF}" },
  { id: "laundry", label: "\u6D17\u8863\u95F4", icon: "\u{1F9FA}" }
];
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
var FAN_SPEEDS = [
  { value: 0, label: "\u5173" },
  { value: 1, label: "\u4F4E" },
  { value: 2, label: "\u4E2D" },
  { value: 3, label: "\u9AD8" }
];
var AC_MODES = [
  { value: "cool", label: "\u5236\u51B7" },
  { value: "heat", label: "\u5236\u70ED" },
  { value: "fan", label: "\u9001\u98CE" },
  { value: "auto", label: "\u81EA\u52A8" }
];
var AC_FAN_SPEEDS = [
  { value: "auto", label: "\u81EA\u52A8" },
  { value: "low", label: "\u4F4E" },
  { value: "mid", label: "\u4E2D" },
  { value: "high", label: "\u9AD8" }
];
var WASHER_PROGRAMS = [
  { value: "standard", label: "\u6807\u51C6" },
  { value: "quick", label: "\u5FEB\u6D17" },
  { value: "delicate", label: "\u8F7B\u67D4" },
  { value: "heavy", label: "\u5F3A\u529B" }
];
var TV_INPUTS = [
  { value: "hdmi1", label: "HDMI 1" },
  { value: "hdmi2", label: "HDMI 2" },
  { value: "tv", label: "\u7535\u89C6" },
  { value: "cast", label: "\u6295\u5C4F" }
];
function deviceSummary(type, state) {
  switch (type) {
    case "range_hood":
      return state.power ? `\u8FD0\u884C \xB7 \u98CE\u901F ${FAN_SPEEDS[state.fan_speed]?.label ?? state.fan_speed}${state.light ? " \xB7 \u706F\u4EAE" : ""}` : "\u5DF2\u5173\u95ED";
    case "air_conditioner":
      return state.power ? `${AC_MODES.find((m) => m.value === state.mode)?.label ?? state.mode} ${state.temperature}\xB0C` : "\u5DF2\u5173\u95ED";
    case "refrigerator":
      return `\u51B7\u85CF ${state.fridge_temp}\xB0C \xB7 \u51B7\u51BB ${state.freezer_temp}\xB0C`;
    case "tv":
      return state.power ? `CH ${state.channel} \xB7 \u97F3\u91CF ${state.volume}` : "\u5DF2\u5173\u95ED";
    case "washer":
      return state.power ? `${WASHER_PROGRAMS.find((p) => p.value === state.program)?.label ?? state.program} \xB7 ${state.status === "running" ? "\u8FD0\u884C\u4E2D" : "\u5F85\u673A"}` : "\u5DF2\u5173\u95ED";
    case "water_heater":
      return state.power ? `\u52A0\u70ED\u4E2D ${state.temperature}\xB0C` : "\u5DF2\u5173\u95ED";
    default:
      return "";
  }
}
export {
  AC_FAN_SPEEDS,
  AC_MODES,
  FAN_SPEEDS,
  ROOMS,
  SCENES,
  TV_INPUTS,
  WASHER_PROGRAMS,
  createDefaultDevices,
  deviceSummary
};
//# sourceMappingURL=devices.js.map
