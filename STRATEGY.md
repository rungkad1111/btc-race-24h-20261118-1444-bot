# Strategy note — Recovery Rider

## What the dev window looks like

The frozen 24h dev window (1,440 one-minute cbBTC bars) falls 2.8%
start to finish, but not smoothly: a sharp drop in the first ~3.5 hours
(65,083 → ~63,600), then a long steady recovery to ~65,100 around bar
510, then a slow grind down to 63,261. Median |1-minute return| is
2.5 bps; a full-size round trip costs ~26 bps in fees, slippage and
price impact. The oracle upper bound (perfect foresight, realistic
costs) is about +$87, so the window rewards patience, not frequency.

## What was tried (local simulator replicating the fill model, then confirmed with grade-local)

- **SMA mean-reversion** (buy 15–60 bps below a 20–60 min SMA, exit at
  the SMA / take-profit / stop): best −$4.30. Every dip kept dipping.
- **Bollinger dip-buy** and **1-minute bar mean-reversion**: all negative.
- **Short momentum** (5–30 min breakout, take-profit/stop): all negative.
- **EMA-cross** (kit baseline): −$148 on grade-local, 80 trades, 5% win rate.
- **RSI-Bollinger** (kit baseline): −$39.92, 19 trades.
- **Buy-and-hold** (kit baseline): −$31.63.

## What shipped

A trend-rider with a trailing stop, no take-profit, no max-hold:

- Entry: 60-min return ≥ +25 bps **and** 120-min return ≥ −250 bps.
- Exit: close ≤ peak-since-entry × (1 − 70 bps).
- Full cash per entry, whole position per exit, at most one position.

It makes exactly 2 round trips on dev: buy bar ~129 (~63,587) → sell
bar ~579 (~64,715), then buy bar ~738 (~64,378) → sell bar ~1180
(~64,387, a scratch). Net **+$10.52**, max drawdown **1.24%**.

## Why this parameter set (robustness, not peak-fitting)

- **Neighbourhood:** look 60–70, entry +25–30 bps, trail 70–80 bps,
  regime −250 to −200 bps all give +$8.30 to +$10.52 on dev. The
  shipped point (60 / +25 / 70 / −250) is inside that plateau, not a
  spike; the regime bound was set at −250 rather than −200 because the
  first entry's 120-min return (−197 bps) passes −200 by only 3 bps,
  which is too thin a margin for integer-rounding differences.
- **Split halves:** first half +$13.96 (1 round trip), second half
  −$3.44 (1 round trip). The strategy is not profitable on both halves
  — the second half has no recovery worth riding — but it loses little
  there, and the loss is bounded by the trailing stop. No variant
  tested was profitable on both halves; the variants that added
  take-profits, max-holds or re-entries all scored worse overall
  (−$7 to −$19) by chopping the one good trade or re-entering chop.
- **Drawdown guard:** worst drawdown in the neighbourhood is 3.4%,
  far under the 25% bar. Exposure is ~62% of the window.

## Race-window expectation

Honest assessment: this bot will only make money on the race window
if that window contains a sustained multi-hour recovery like the dev
window's middle. In a flat or grinding-down window it trades rarely
and loses little (its worst observed half is −$3.44). That asymmetry
— one good recovery pays ~+$14, chop costs ~$3 — is the whole bet.
