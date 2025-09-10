const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

// 中間件
app.use(cors());
app.use(express.json());

// 模擬玩家資料
const players = new Map();

// 獲取或創建玩家
function getOrCreatePlayer(key) {
    if (!players.has(key)) {
        const [playerId, balance, currency] = key.split(':');
        players.set(key, {
            id: playerId,
            balance: parseInt(balance) || 1000,
            currency: currency || 'eur',
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
    }
    return players.get(key);
}

// 認證端點 - 支援多種路徑格式
const authHandler = (req, res) => {
    console.log('Auth request:', req.body);
    const { operator, wallet, key } = req.body;
    
    if (!key) {
        return res.status(400).json({
            error: { code: "MISSING_KEY", message: "Player key is required" }
        });
    }
    
    const player = getOrCreatePlayer(key);
    
    res.json({
        sessionId: player.sessionId,
        balance: player.balance,
        currency: player.currency,
        token: `token_${player.sessionId}`,
        success: true
    });
};

// 遊戲資訊端點
const infoHandler = (req, res) => {
    console.log('Info request:', req.body);
    res.json({
        name: "slot-game",
        provider: "slot-game-provider",
        bets: [1, 2, 5, 10, 20, 50, 100],
        maxWin: 10000,
        currency: "eur"
    });
};

// 遊戲玩法端點
const playHandler = (req, res) => {
    console.log('Play request:', req.body);
    const { sessionId, action, bet } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({
            error: { code: "INVALID_SESSION", message: "Session ID is required" }
        });
    }
    
    // 簡單的老虎機邏輯
    const symbols = ['SYM1', 'SYM2', 'SYM3', 'SYM4', 'SYM5', 'SYM6'];
    const reels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
    
    // 檢查獲勝條件
    const uniqueSymbols = new Set(reels);
    const isWin = (uniqueSymbols.size === 1 && !uniqueSymbols.has('SYM1')) ||
                  (uniqueSymbols.size === 2 && uniqueSymbols.has('SYM1'));
    
    const winAmount = isWin ? bet * 2 : 0;
    const winType = isWin ? (uniqueSymbols.size === 1 ? 'three_of_a_kind' : 'wild_combo') : null;
    
    // 更新玩家餘額（簡化版）
    const playerKey = Array.from(players.keys()).find(key => players.get(key).sessionId === sessionId);
    if (playerKey) {
        const player = players.get(playerKey);
        player.balance = player.balance - bet + winAmount;
    }
    
    res.json({
        symbols: reels,
        isWin,
        win: winAmount,
        winType,
        balance: playerKey ? players.get(playerKey).balance : 1000,
        action: "main"
    });
};

// 註冊多種路徑格式
// 標準 Tequity 格式
app.post('/slot-game-provider/slot-game/authenticate', authHandler);
app.post('/slot-game-provider/slot-game/info', infoHandler);
app.post('/slot-game-provider/slot-game/play', playHandler);

// 簡化格式
app.post('/authenticate', authHandler);
app.post('/info', infoHandler);
app.post('/play', playHandler);

// 遊戲名稱格式
app.post('/slot-game/authenticate', authHandler);
app.post('/slot-game/info', infoHandler);
app.post('/slot-game/play', playHandler);

// 根路徑 - 健康檢查
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Slot Game Mock API',
        endpoints: [
            'POST /authenticate',
            'POST /info', 
            'POST /play'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🎰 Mock Slot Game API Server running on port ${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   POST http://localhost:${PORT}/authenticate`);
    console.log(`   POST http://localhost:${PORT}/info`);
    console.log(`   POST http://localhost:${PORT}/play`);
});
