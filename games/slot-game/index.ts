import {IGame} from "@slotify/gdk/lib/IGame";
import Iterations from "@slotify/gdk/lib/stats/Iterations";
import RTP from "@slotify/gdk/lib/stats/RTP";
import Variance from "@slotify/gdk/lib/stats/Variance";
import ConfidenceInterval from "@slotify/gdk/lib/stats/ConfidenceInterval";
import HitFrequency from "@slotify/gdk/lib/stats/HitFrequency";
import MaxWin from "@slotify/gdk/lib/stats/MaxWin";
import {IRandom} from "@slotify/rng/lib/random/IRandom";

// Slot game symbols - 完全對應原始遊戲
const SYMBOLS = ['SYM1', 'SYM2', 'SYM3', 'SYM4', 'SYM5', 'SYM6'];

interface SlotGameState {
    lastWin?: number;
    symbols?: string[];
    streak?: number;
}

interface SlotGameData {
    symbols: string[];
    isWin: boolean;
    winType?: 'three_of_a_kind' | 'wild_combo';
}

export const index: IGame = {
    name: "slot-game",

    bets: {
        "main": {
            available: [1, 2, 5, 10, 20, 50, 100, 200],
            default: 5,
            maxWin: 10000,
            coin: 1
        },
    },

    config: (variant?: string) => {
        // Return game configuration
        return {
            symbols: SYMBOLS,
            reelCount: 3,
            winMultiplier: 2,
            gameName: "Slot Game",
            gameVersion: "1.0.0",
            // Private config (starts with _) won't be sent to client
            _internalConfig: "server-only-data"
        };
    },

    stats: {
        iterations: new Iterations(),
        rtp: new RTP(),
        variance: new Variance(),
        confidenceInterval: new ConfidenceInterval(95.0),
        hitFrequency: new HitFrequency((wagers: any) => wagers.some((wager: any) => wager.win > 0)),
        maxWin: new MaxWin(),
    },

    cheats: {
        "main": {
            "win": (wager: any) => wager.win > 0,
            "bigWin": (wager: any) => wager.win > wager.bet * 2,
        },
    },

    validate: (request, betLimits) => {
        // Custom validation for side bets
        if (request.action !== "main") {
            // Only main action is allowed for this simple slot game
            return false;
        }

        // Validate bet limits
        if (request.bet < betLimits.minBet) return false;
        if (request.bet > betLimits.maxBet) return false;

        return true;
    },

    simulate({wagers}: {wagers: any[]}, random: IRandom) {
        // Simulation logic for statistical analysis
        if (wagers.length === 0) {
            return {
                action: "main",
            };
        }

        // Always return main action for slot games
        return {
            action: "main",
        };
    },

    action({next, config}: {next: string[], config: any}, random: IRandom) {
        // For simple slot game, always return main action
        // This is called when RGS needs to auto-complete rounds
        return {
            action: "main",
        };
    },

    play({action, bet, state}: {action: string, bet: number, state?: SlotGameState}, random: IRandom) {
        if (action !== "main") {
            throw new Error("Invalid action for slot game");
        }

        // Generate random symbols for the 3 reels - 使用原始遊戲的隨機邏輯
        const symbols = [
            getRandomSymbol(random),
            getRandomSymbol(random),
            getRandomSymbol(random)
        ];

        // Check for win conditions
        const { isWin, winAmount, winType } = checkWinCondition(symbols, bet);

        const gameData: SlotGameData = {
            symbols,
            isWin,
            winType
        };

        const newState: SlotGameState = {
            lastWin: winAmount,
            symbols,
            streak: isWin ? (state?.streak || 0) + 1 : 0
        };

        return {
            win: winAmount,
            data: gameData,
            state: newState,
        };
    },

    evaluate: (type: string, wagers: any[]) => {
        switch (type) {
            case "regulatory-pt":
                // Portugal regulatory compliance
                return {
                    "sm_result": createSmResult(wagers),
                    "descr_ap": "SlotGame"
                };
            default:
                return {};
        }
    },
};

/**
 * Create sm_result for Portugal regulatory compliance
 */
function createSmResult(wagers: any[]): string {
    // Simplified sm_result format for demonstration
    // Format: "0:symbol1;symbol2;symbol3#"
    if (wagers.length === 0) return "";

    const results = wagers.map((wager) => {
        if (wager.data && wager.data.symbols) {
            const symbolIndices = wager.data.symbols.map((sym: string) => SYMBOLS.indexOf(sym));
            return `${symbolIndices.join(';')}`;
        }
        return "0;0;0";
    });

    return `0:${results.join('#')}#`;
}

/**
 * Get a random symbol - 完全對應原始遊戲邏輯
 */
function getRandomSymbol(random: IRandom): string {
    return SYMBOLS[random(SYMBOLS.length)];
}

/**
 * Check win conditions for the slot game - 完全對應原始遊戲邏輯
 * Win conditions:
 * 1. All same symbols (except SYM1) - 2x bet
 * 2. Two different symbols where one is SYM1 - 2x bet  
 */
function checkWinCondition(symbols: string[], bet: number): { 
    isWin: boolean; 
    winAmount: number; 
    winType?: 'three_of_a_kind' | 'wild_combo';
} {
    const uniqueSymbols = new Set(symbols);
    
    // Win conditions from original game:
    // 1. All same symbols (except SYM1)
    // 2. Two different symbols where one is SYM1
    const isWin = (uniqueSymbols.size === 1 && !uniqueSymbols.has('SYM1')) ||
                  (uniqueSymbols.size === 2 && uniqueSymbols.has('SYM1'));
    
    if (isWin) {
        const winType = uniqueSymbols.size === 1 ? 'three_of_a_kind' : 'wild_combo';
        return {
            isWin: true,
            winAmount: bet * 2, // 原始遊戲固定2倍
            winType
        };
    }
    
    // No win
    return {
        isWin: false,
        winAmount: 0
    };
}

export default index;
