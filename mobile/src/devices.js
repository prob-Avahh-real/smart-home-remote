/** @typedef {{ id: string, type: string, label: string, icon: string, room: string, state: Record<string, unknown> }} DeviceDef */

export const ROOMS = [
  { id: 'living', label: '客厅', icon: '🛋️' },
  { id: 'kitchen', label: '厨房', icon: '🍳' },
  { id: 'bedroom', label: '卧室', icon: '🛏️' },
  { id: 'bathroom', label: '卫生间', icon: '🚿' },
  { id: 'laundry', label: '洗衣间', icon: '🧺' },
];

/** @returns {DeviceDef[]} */
export function createDefaultDevices() {
  return [
    {
      id: 'range_hood',
      type: 'range_hood',
      label: '抽油烟机',
      icon: '🌀',
      room: 'kitchen',
      state: { power: false, fan_speed: 0, light: false },
    },
    {
      id: 'air_conditioner',
      type: 'air_conditioner',
      label: '空调',
      icon: '❄️',
      room: 'living',
      state: { power: false, temperature: 26, mode: 'cool', fan_speed: 'auto' },
    },
    {
      id: 'refrigerator',
      type: 'refrigerator',
      label: '冰箱',
      icon: '🧊',
      room: 'kitchen',
      state: { power: true, fridge_temp: 4, freezer_temp: -18, ice_maker: true },
    },
    {
      id: 'tv',
      type: 'tv',
      label: '电视',
      icon: '📺',
      room: 'living',
      state: { power: false, volume: 35, channel: 1, input: 'hdmi1' },
    },
    {
      id: 'washer',
      type: 'washer',
      label: '洗衣机',
      icon: '🫧',
      room: 'laundry',
      state: { power: false, program: 'standard', status: 'idle' },
    },
    {
      id: 'water_heater',
      type: 'water_heater',
      label: '热水器',
      icon: '🔥',
      room: 'bathroom',
      state: { power: true, temperature: 42 },
    },
  ];
}

export const SCENES = [
  { id: 'home', label: '回家模式', icon: '🏠', desc: '开空调、开灯、关电视' },
  { id: 'sleep', label: '睡眠模式', icon: '🌙', desc: '空调 26°C、关闭其他设备' },
  { id: 'cooking', label: '烹饪模式', icon: '👨‍🍳', desc: '油烟机高档、开照明' },
  { id: 'away', label: '离家模式', icon: '🚪', desc: '关闭全部可控设备' },
];

export const FAN_SPEEDS = [
  { value: 0, label: '关' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
];

export const AC_MODES = [
  { value: 'cool', label: '制冷' },
  { value: 'heat', label: '制热' },
  { value: 'fan', label: '送风' },
  { value: 'auto', label: '自动' },
];

export const AC_FAN_SPEEDS = [
  { value: 'auto', label: '自动' },
  { value: 'low', label: '低' },
  { value: 'mid', label: '中' },
  { value: 'high', label: '高' },
];

export const WASHER_PROGRAMS = [
  { value: 'standard', label: '标准' },
  { value: 'quick', label: '快洗' },
  { value: 'delicate', label: '轻柔' },
  { value: 'heavy', label: '强力' },
];

export const TV_INPUTS = [
  { value: 'hdmi1', label: 'HDMI 1' },
  { value: 'hdmi2', label: 'HDMI 2' },
  { value: 'tv', label: '电视' },
  { value: 'cast', label: '投屏' },
];

/** @param {string} type */
export function deviceSummary(type, state) {
  switch (type) {
    case 'range_hood':
      return state.power
        ? `运行 · 风速 ${FAN_SPEEDS[state.fan_speed]?.label ?? state.fan_speed}${state.light ? ' · 灯亮' : ''}`
        : '已关闭';
    case 'air_conditioner':
      return state.power
        ? `${AC_MODES.find((m) => m.value === state.mode)?.label ?? state.mode} ${state.temperature}°C`
        : '已关闭';
    case 'refrigerator':
      return `冷藏 ${state.fridge_temp}°C · 冷冻 ${state.freezer_temp}°C`;
    case 'tv':
      return state.power ? `CH ${state.channel} · 音量 ${state.volume}` : '已关闭';
    case 'washer':
      return state.power
        ? `${WASHER_PROGRAMS.find((p) => p.value === state.program)?.label ?? state.program} · ${state.status === 'running' ? '运行中' : '待机'}`
        : '已关闭';
    case 'water_heater':
      return state.power ? `加热中 ${state.temperature}°C` : '已关闭';
    default:
      return '';
  }
}
