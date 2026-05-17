# Runtime Boundary Refactor Requirements

## Goal

Make the dashboard easier to maintain by separating runtime responsibilities before moving files around.

The current project is a local realtime arbitrage workstation. It combines quote polling, market state, arbitrage discovery, alerts, historical snapshots, and UI rendering. The refactor must preserve existing behavior while reducing unnecessary work and making future modules smaller.

## Architecture Principles

1. Market data and UI state are different concerns.
   - Market data should drive arbitrage, alerts, snapshots, and data terminal calculations.
   - UI-only state such as trend timers, panel visibility, selected rows, and editing state should not invalidate market calculations.

2. Expensive work should be demand-driven.
   - Hidden panels should not rebuild large view models.
   - Path alert polling should stop when there are no active path or rule alerts.
   - Detail quote refresh should run on a controlled interval, not a continuous loop.

3. Configuration must keep a single source of truth per concern.
   - `config/config.js` owns quote/category configuration.
   - `config/alert.js` owns alert runtime configuration.
   - `arb-path-config.js` owns explicit watchlist display configuration unless a later migration changes that contract.

4. Extraction should follow runtime boundaries.
   - First extract small pure utilities with tests.
   - Then move larger orchestration code after behavior is covered.
   - Do not split a large file into smaller files that still share implicit global state.

## First Slice Scope

This slice does not rewrite the UI framework, change storage formats, or migrate alert/watchlist ownership.

It should:

- Add tested runtime helpers for panel visibility, alert scheduler eligibility, and cache keys.
- Stop scheduling arbitrage panel rebuilds while the panel is hidden; mark it dirty and refresh when reopened.
- Skip path alert intervals when there are no enabled non-quote alert targets.
- Add a fixed delay between arbitrage detail refresh rounds.
- Cache data terminal records between unchanged market/config revisions.

## Acceptance Criteria

- Existing dashboard behavior remains compatible.
- Runtime config changes are not included in code commits by default unless the change explicitly migrates config ownership or format.
- New helper logic has unit tests.
- Existing full test suite passes.
