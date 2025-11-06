const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 8080;

// 中間件
app.use(cors());
app.use(express.json());

// 模擬玩家資料
const players = new Map();
const rounds = new Map();

// Game symbols
const SYMBOLS = ['SYM1', 'SYM2', 'SYM3', 'SYM4', 'SYM5', 'SYM6'];

// 獲取或創建玩家
function getOrCreatePlayer(key) {
    if (!players.has(key)) {
        const [playerId, balance, currency] = key.split(':');
        players.set(key, {
            id: playerId,
            balance: parseInt(balance) || 1000,
            currency: currency || 'eur',
            sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            state: {}
        });
    }
    return players.get(key);
}

// Generate UUID
function generateUUID() {
    return crypto.randomUUID();
}

// Generate random symbols
function generateSymbols() {
    return [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];
}

// Check win condition
function checkWinCondition(symbols, bet) {
    const uniqueSymbols = new Set(symbols);
    const isWin = (uniqueSymbols.size === 1 && !uniqueSymbols.has('SYM1')) ||
                  (uniqueSymbols.size === 2 && uniqueSymbols.has('SYM1'));

    const winAmount = isWin ? bet * 2 : 0;
    const winType = isWin ? (uniqueSymbols.size === 1 ? 'three_of_a_kind' : 'wild_combo') : null;

    return { isWin, winAmount, winType };
}

// 認證端點
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

// 配置端點
const configHandler = (req, res) => {
    console.log('Config request');
    res.json({
        symbols: SYMBOLS,
        reelCount: 3,
        winMultiplier: 2,
        gameName: "Slot Game",
        gameVersion: "1.0.0"
    });
};

// Bets端點
const betsHandler = (req, res) => {
    console.log('Bets request');
    res.json({
        bets: {
            main: {
                available: [1, 2, 5, 10, 20, 50, 100, 200],
                default: 5,
                maxWin: 10000,
                coin: 1
            }
        }
    });
};

// 遊戲資訊端點
const infoHandler = (req, res) => {
    console.log('Info request:', req.body);
    res.json({
        name: "slot-game",
        provider: "slot-game-provider",
        bets: {
            main: {
                available: [1, 2, 5, 10, 20, 50, 100, 200],
                default: 5,
                maxWin: 10000,
                coin: 1
            }
        },
        config: {
            symbols: SYMBOLS,
            reelCount: 3,
            winMultiplier: 2
        }
    });
};

// Cheats端點
const cheatsHandler = (req, res) => {
    console.log('Cheats request');
    res.json({
        main: ["win", "bigWin", "superWin"]
    });
};

// 遊戲玩法端點 (標準 Tequity 多步驟遊戲流程)
const playHandler = (req, res) => {
    console.log('Play request:', req.body);
    const { sessionId, action, bet, cheat, roundId } = req.body;

    if (!sessionId) {
        return res.status(400).json({
            error: { code: "INVALID_SESSION", message: "Session ID is required" }
        });
    }

    // Find player by sessionId
    const playerKey = Array.from(players.keys()).find(key =>
        players.get(key).sessionId === sessionId
    );

    if (!playerKey) {
        return res.status(400).json({
            error: { code: "INVALID_SESSION", message: "Invalid session" }
        });
    }

    const player = players.get(playerKey);

    // 檢查是否為 bonus_spin action (多步驟遊戲的第二步)
    if (action === 'bonus_spin') {
        // 處理 Bonus Spin (免費旋轉)
        const round = rounds.get(roundId);

        if (!round) {
            return res.status(400).json({
                error: { code: "INVALID_ROUND", message: "Round not found" }
            });
        }

        // Bonus spin 是免費的，不扣錢
        let symbols = generateSymbols();
        let result = checkWinCondition(symbols, bet || 5);
        let winAmount = result.winAmount;
        let winType = result.winType;
        let isWin = result.isWin;

        // 檢查是否由 superWin 作弊碼觸發（查看回合的 cheat 標記）
        if (round.guaranteedSuperWin) {
            // superWin 作弊碼：保證 Bonus Spin 中獎並升級為 SuperWin
            symbols = ['SYM2', 'SYM2', 'SYM2']; // 確保中獎符號
            isWin = true;
            winAmount = (bet || 5) * 50; // SuperWin 是 50 倍！
            winType = 'super_win';
            console.log(`🎆 superWin 作弊碼：Bonus Spin 保證中獎！超級大獎: ${winAmount}`);
        } else {
            // 正常的 bigWin 觸發：如果 bonus spin 中獎，升級為 SuperWin
            if (isWin) {
                winAmount = (bet || 5) * 50; // SuperWin 是 50 倍！
                winType = 'super_win';
                console.log(`🎆 觸發 SuperWin！超級大獎: ${winAmount}`);
            }
        }

        // 更新玩家餘額（只加獎金，不扣下注）
        player.balance = player.balance + winAmount;

        // 更新回合資料
        const bonusWager = {
            data: { symbols, isWin, winType },
            win: winAmount,
            bet: 0, // Bonus spin 是免費的
            timestamp: new Date().toISOString()
        };

        round.wagers.push(bonusWager);
        round.finished = true; // Bonus spin 完成後，回合結束
        round.pendingActions = [];

        return res.json({
            wager: {
                data: { symbols, isWin, winType },
                win: winAmount,
                next: [] // 回合結束，沒有下一步動作
            },
            roundId: roundId,
            balance: player.balance,
            action: "bonus_spin",
            totalWin: round.wagers.reduce((sum, w) => sum + w.win, 0)
        });
    }

    // 主遊戲邏輯 (action === 'main' 或未指定)
    // Check sufficient funds
    if (player.balance < bet) {
        return res.status(400).json({
            error: { code: "INSUFFICIENT_FUNDS", message: "Insufficient funds" }
        });
    }

    let symbols, isWin, winAmount, winType;
    let nextActions = [];

    // 處理作弊碼
    if (cheat === 'win' || cheat === 'bigWin' || cheat === 'superWin') {
        // 作弊碼：確保中獎
        symbols = ['SYM2', 'SYM2', 'SYM2']; // 三個相同符號（非野生符號）
        isWin = true;

        if (cheat === 'superWin') {
            // superWin: 先顯示 bigWin，然後透過 bonus spin 達到 superWin
            winAmount = bet * 10;
            winType = 'big_win';
            nextActions = ['bonus_spin']; // 觸發 bonus spin，在 bonus spin 中會升級為 superWin
            console.log(`🎰 使用作弊碼: ${cheat} (先 bigWin 再透過 bonus spin 升級), 符號: ${symbols}, 獲勝金額: ${winAmount}`);
        } else if (cheat === 'bigWin') {
            winAmount = bet * 10;
            winType = 'big_win';
            nextActions = ['bonus_spin']; // bigWin 觸發額外旋轉
            console.log(`🎰 使用作弊碼: ${cheat}, 符號: ${symbols}, 獲勝金額: ${winAmount}`);
        } else {
            winAmount = bet * 2;
            winType = 'three_of_a_kind';
            console.log(`🎰 使用作弊碼: ${cheat}, 符號: ${symbols}, 獲勝金額: ${winAmount}`);
        }
    } else {
        // 正常遊戲：隨機生成
        symbols = generateSymbols();
        const result = checkWinCondition(symbols, bet);
        isWin = result.isWin;
        winAmount = result.winAmount;
        winType = result.winType;

        // 檢查是否觸發 bigWin (50% 機率 - 方便測試)
        if (isWin && Math.random() < 0.5) {
            winAmount = bet * 10;
            winType = 'big_win';
            nextActions = ['bonus_spin'];
            console.log(`🎰 觸發 BigWin！額外獎勵: ${winAmount}`);
        }
    }

    // Update player balance (先扣除下注，稍後加上獎金)
    player.balance = player.balance - bet + winAmount;

    // Create round
    const newRoundId = generateUUID();
    const wager = {
        data: { symbols, isWin, winType },
        win: winAmount,
        bet: bet,
        timestamp: new Date().toISOString()
    };

    // 如果有 nextActions，回合還沒結束
    const isFinished = nextActions.length === 0;

    // 建立回合資料
    const roundData = {
        roundId: newRoundId,
        wagers: [wager],
        finished: isFinished,
        playerId: player.id,
        pendingActions: nextActions
    };

    // 如果是 superWin 作弊碼，標記保證 SuperWin
    if (cheat === 'superWin') {
        roundData.guaranteedSuperWin = true;
    }

    rounds.set(newRoundId, roundData);

    res.json({
        wager: {
            data: { symbols, isWin, winType },
            win: winAmount,
            next: nextActions
        },
        roundId: newRoundId,
        balance: player.balance,
        action: action || 'main'
    });
};

// Action端點 (for auto-complete)
const actionHandler = (req, res) => {
    console.log('Action request:', req.body);
    // For simple slot, always return main action
    res.json({
        action: "main"
    });
};

// Validate端點
const validateHandler = (req, res) => {
    console.log('Validate request:', req.body);
    const { action, bet } = req.body;

    // Simple validation
    const valid = action === "main" && bet > 0 && bet <= 200;

    res.json({
        valid: valid
    });
};

// Evaluate端點
const evaluateHandler = (req, res) => {
    console.log('Evaluate request:', req.body);
    const { type, wagers } = req.body;

    if (type === "regulatory-pt") {
        // Create simplified sm_result
        const smResult = wagers.map(w => {
            if (w.data && w.data.symbols) {
                const indices = w.data.symbols.map(s => SYMBOLS.indexOf(s));
                return indices.join(';');
            }
            return "0;0;0";
        }).join('#');

        return res.json({
            sm_result: `0:${smResult}#`,
            descr_ap: "SlotGame"
        });
    }

    res.json({});
};

// Health check
const healthHandler = (req, res) => {
    res.send('OK');
};

// Critical file checksum
const checksumHandler = (req, res) => {
    const { criticalFilePath } = req.query;
    // Mock checksum
    const hash = crypto.createHash('sha1').update(criticalFilePath || '').digest('hex');
    res.json({
        checksum: hash
    });
};

// Games list handler
const gamesHandler = (req, res) => {
    console.log('Games list request');
    res.json({
        'slot-game-provider': ['slot-game']
    });
};

// 註冊所有路徑格式
// Tequity standard format
app.post('/slot-game-provider/slot-game/authenticate', authHandler);
app.get('/slot-game-provider/slot-game/config', configHandler);
app.get('/slot-game-provider/slot-game/bets', betsHandler);
app.post('/slot-game-provider/slot-game/info', infoHandler);
app.get('/slot-game-provider/slot-game/cheats', cheatsHandler);
app.post('/slot-game-provider/slot-game/play', playHandler);
app.post('/slot-game-provider/slot-game/action', actionHandler);
app.post('/slot-game-provider/slot-game/validate', validateHandler);
app.post('/slot-game-provider/slot-game/evaluate', evaluateHandler);
app.get('/slot-game-provider/slot-game/criticalFileChecksum', checksumHandler);

// Simplified format
app.post('/authenticate', authHandler);
app.get('/config', configHandler);
app.get('/bets', betsHandler);
app.post('/info', infoHandler);
app.get('/cheats', cheatsHandler);
app.post('/play', playHandler);
app.post('/action', actionHandler);
app.post('/validate', validateHandler);
app.post('/evaluate', evaluateHandler);
app.get('/criticalFileChecksum', checksumHandler);

// Game name format
app.post('/slot-game/authenticate', authHandler);
app.get('/slot-game/config', configHandler);
app.get('/slot-game/bets', betsHandler);
app.post('/slot-game/info', infoHandler);
app.get('/slot-game/cheats', cheatsHandler);
app.post('/slot-game/play', playHandler);
app.post('/slot-game/action', actionHandler);
app.post('/slot-game/validate', validateHandler);
app.post('/slot-game/evaluate', evaluateHandler);
app.get('/slot-game/criticalFileChecksum', checksumHandler);

// Games list endpoint
app.get('/api/games', gamesHandler);

// Health check
app.get('/health', healthHandler);

// Root path
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Slot Game Mock API',
        endpoints: [
            'GET /api/games',
            'POST /authenticate',
            'GET /config',
            'GET /bets',
            'POST /info',
            'GET /cheats',
            'POST /play',
            'POST /action',
            'POST /validate',
            'POST /evaluate',
            'GET /criticalFileChecksum',
            'GET /health'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🎰 Mock Slot Game API Server running on port ${PORT}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/api/games`);
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   POST http://localhost:${PORT}/authenticate`);
    console.log(`   GET  http://localhost:${PORT}/config`);
    console.log(`   GET  http://localhost:${PORT}/bets`);
    console.log(`   POST http://localhost:${PORT}/info`);
    console.log(`   GET  http://localhost:${PORT}/cheats`);
    console.log(`   POST http://localhost:${PORT}/play`);
    console.log(`   POST http://localhost:${PORT}/action`);
    console.log(`   POST http://localhost:${PORT}/validate`);
    console.log(`   POST http://localhost:${PORT}/evaluate`);
    console.log(`   GET  http://localhost:${PORT}/criticalFileChecksum`);
    console.log(`   GET  http://localhost:${PORT}/health`);
});
