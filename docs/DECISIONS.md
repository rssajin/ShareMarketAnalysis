# Architecture Decision Record

## ADR-001: Decision support before automated trading

### Decision

The initial product will analyze investments and generate recommendations but will not automatically execute trades.

### Reason

Investment rules contain judgment and exceptions. Explicit user confirmation reduces operational and financial risk.

## ADR-002: Provider abstraction

### Decision

Zerodha, Groww, and future providers will be implemented behind common interfaces.

### Reason

External APIs/MCP capabilities can change and differ by provider.

## ADR-003: Deterministic scoring

### Decision

Financial ratios, allocation percentages, thresholds, and scores are calculated by application code.

### Reason

These calculations must be reproducible and testable.

AI may explain or enrich qualitative analysis but must not silently alter deterministic financial calculations.

## ADR-004: Configurable thresholds

### Decision

Thresholds such as allocation tolerance and 10–15% mid/small-cap sell trigger are configuration values.

### Reason

The user's strategy may evolve without requiring code changes.
