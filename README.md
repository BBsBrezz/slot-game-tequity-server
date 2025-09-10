# Slot Game Tequity Server

這是一個為Tequity平台開發的老虎機遊戲服務器，完全基於原始slot game的遊戲邏輯。

## 🎮 遊戲特色

### 遊戲邏輯
- **遊戲類型**: 3轉輪老虎機
- **符號系統**: 6種符號 (SYM1-SYM6)，SYM1為萬能符號
- **下注範圍**: $1 - $200
- **最大贏金**: $10,000

### 贏法規則 (完全對應原始遊戲)
1. **三個相同符號** (除SYM1外) → 2倍下注
2. **萬能組合** (兩種不同符號 + 一個SYM1) → 2倍下注

## 🚀 快速開始

### 安裝依賴
\`\`\`bash
npm install
\`\`\`

### 開發模式
\`\`\`bash
npm run start:dev
\`\`\`

### 生產模式
\`\`\`bash
npm run build
npm start
\`\`\`

### Docker部署
\`\`\`bash
./script/deploy.sh
\`\`\`

## 📋 技術架構
- **框架**: @slotify/gdk (Tequity官方框架)
- **介面**: 完整實現IGame interface
- **語言**: TypeScript
- **部署**: Docker容器化

---

*此專案完全基於原始slot game邏輯開發*
