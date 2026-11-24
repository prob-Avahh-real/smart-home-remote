# 智家遥控 (smart-home-remote)

MQTT 家居遥控：房间/场景、声控、摄像头手势、智能戒指/手杖。源码已从 `www/js/*.map` 恢复。

## 命令

```bash
cd mobile
npm install
npm test
npm run build
npm run sync:android
npm run apk:debug
```

改 `src/` 或 `index.html` 后务必 `npm run build && npx cap sync android`。
