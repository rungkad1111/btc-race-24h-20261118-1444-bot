# Recovery Rider — a BTC trading bot for btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/rungkad1111/btc-race-24h-20261118-1444-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/rungkad1111/btc-race-24h-20261118-1444-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)

A bot that trades Coinbase Wrapped BTC (cbBTC) against USDC, one minute
at a time, with $1,000 of paper money, for the
[make.fun](https://make.fun/bounty/btc-race-24h-20261118-1444) 24-hour
BTC race. It is deliberately quiet: it waits for a confirmed recovery,
rides it with a trailing stop, and otherwise holds cash.

- **Entry (flat only):** 60-minute return ≥ +25 bps **and** 120-minute
  return ≥ −250 bps (regime filter against steep downtrends).
- **Exit (long only):** sell everything when the close falls 70 bps
  below the highest close since entry (trailing stop, no fixed
  take-profit).
- One full-cash buy per entry, at most one open position, long only.
- Exact integer arithmetic on bar closes — no floats, no clock, no
  randomness — so two runs on the same bars answer byte for byte the
  same.

**Dev-window result** (grade-local, process driver): net PnL **+$10.52**,
2 round trips (4 fills, win rate 50%), max drawdown **1.24%**, fees
$1.62. Guardrails met; L1 regrade reproduced byte for byte.

See [STRATEGY.md](STRATEGY.md) for the validation and the variants
that were tried and rejected. `main.ts` is the whole bot (Node 22,
standard library only, plus the vendored kit shim under `vendor/`).
