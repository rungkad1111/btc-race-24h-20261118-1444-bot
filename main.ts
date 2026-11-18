// Recovery-rider bot for btc-race-24h-20261118-1444 (agent-fun/bars-replay/v1).
//
// Strategy, in one paragraph: the dev window is a slow grind down with one
// long, steady recovery in the middle (roughly bars 130-580, about +2% peak
// to trough). Fast mean-reversion and short-horizon momentum both lose
// money there: every dip keeps dipping, every cross whipsaws, and a
// round trip costs about 26 bps. So this bot does almost nothing. It waits
// for a confirmed recovery -- the 60-minute return turning positive -- and
// only then buys, with a 120-minute regime filter that keeps it out of
// steep downtrends, and it rides the move with a trailing stop instead of
// a fixed take-profit, so a multi-hour recovery is not cut short. Two
// round trips on the whole dev window (4 fills), one winner, one scratch.
//
// Rules (all exact bigint arithmetic on the bar closes, no floats, no
// clock, no randomness, no environment -- two runs on the same bars
// answer byte for byte the same):
//
//   ENTRY (flat only):  60-min return >= +25 bps AND 120-min return >= -250 bps
//   EXIT (long only):   close <= peak close since entry x (1 - 70 bps)
//
//   - Entry is one full-cash buy (capped by the weight room), exit sells
//     the whole position. At most one open position, long only.
//   - The peak is the highest close seen since the entry bar, tracked
//     bar by bar; the trailing stop is checked on every close.
//   - Orders use max_slippage_bps 10000 (never rejected for slippage);
//     the market's own fee/slippage/impact still applies at the fill.
//   - Warm-up bars are never traded on. A minute with no CBBTC bar is
//     skipped (no history recorded for that seq).
//
// Dev-window result (grade-local, process driver): net PnL +$10.52,
// 2 round trips (4 fills, win rate 50%), max drawdown 1.24%,
// fees $1.62. See STRATEGY.md for the validation (split halves,
// parameter neighbourhood) and why the complicated variants were rejected.

import { BPS, runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// 60-minute momentum window for the entry signal.
const LOOKBACK_BARS = 60;
// Entry needs a 60-minute return of at least +25 bps.
const ENTRY_BPS = 25n;
// 120-minute regime filter: stay out while the 2-hour return is
// worse than -250 bps (a steep downtrend, where recoveries fail).
const REGIME_BARS = 120;
const REGIME_MIN_BPS = -250n;
// Trailing stop: sell when the close falls 70 bps below the highest
// close since the entry bar.
const TRAIL_BPS = 70n;

// Close by batch seq (bigint, at the symbol's price_scale), only for
// batches that actually carried a CBBTC bar.
const closes = new Map<number, bigint>();
// Highest close seen since the entry bar (null while flat).
let peak: bigint | null = null;

await runBars({
  onHello(_state: BarsState): void {
    closes.clear();
    peak = null;
  },

  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    if (state.warmingUp) return [];
    let close: bigint | null = null;
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) {
        close = BigInt(bar.c);
        break;
      }
    }
    if (close === null) return [];
    const seq = state.seq;
    closes.set(seq, close);

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      if (peak === null || close > peak) peak = close;
      // Trailing stop: close <= peak * (1 - 70 bps), exactly.
      if (close * BPS <= peak * (BPS - TRAIL_BPS)) {
        peak = null;
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: 10_000 }];
      }
      return [];
    }

    // Flat: look for a confirmed recovery.
    peak = null;
    const then60 = closes.get(seq - LOOKBACK_BARS);
    const then120 = closes.get(seq - REGIME_BARS);
    if (then60 === undefined || then120 === undefined) return [];
    // 60-min return >= +25 bps: close * 10000 >= close60 * 10025.
    if (close * BPS < then60 * (BPS + ENTRY_BPS)) return [];
    // 120-min return >= -250 bps: close * 10000 >= close120 * 9750.
    if (close * BPS < then120 * (BPS + REGIME_MIN_BPS)) return [];
    let notional = state.cash;
    const room = state.weightRoom(SYMBOL);
    if (room < notional) notional = room;
    if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    peak = close;
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: 10_000 }];
  },
});
