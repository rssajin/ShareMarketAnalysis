# Project Requirements

## 1. Product Vision

Create a web application that analyzes Indian stocks and mutual funds using the user's custom investment strategy.

The application must answer:

> Which investments fit my rules, and does my current portfolio satisfy my rules?

## 2. Functional requirements

### Stock analysis

The system shall:

- Analyze large-, mid-, and small-cap stocks.
- Calculate financial, growth, valuation, cash-flow, management, moat, innovation, future, risk, and market parameters.
- Apply the 100-point stock score.
- Classify AI disruption risk as:
  - AI beneficiary
  - AI neutral
  - AI vulnerable
- Compare companies with industry and competitors.
- Identify failed investment checks.
- Produce a clear investment-attractiveness explanation.

### Mutual-fund analysis

The system shall:

- Analyze mutual-fund category, portfolio composition, risk, costs, consistency, and overlap.
- Support the user's four-fund allocation framework.
- Track SIP investments.
- Track the 15-year investment horizon.
- Identify allocation drift and rule violations.

### Portfolio analysis

The system shall:

- Import holdings from supported integrations.
- Calculate allocation percentages.
- Compare actual allocation with target allocation.
- Identify rule violations.
- Show portfolio-level warnings.
- Notify the user when rules are not satisfied.

### Notifications

Notifications shall support:

- Portfolio allocation violation
- Excess concentration
- Stock quality deterioration
- Debt/financial-health deterioration
- Promoter pledge increase
- AI-disruption classification change
- Mutual-fund allocation drift
- SIP/rule exceptions

## 3. Non-functional requirements

- Secure authentication
- Encrypted secrets
- Role-aware API authorization
- Audit logging
- Responsive UI
- Typed APIs
- Automated tests
- Observability
- Retry and timeout handling for external providers
- Provider abstraction so one broker/data provider can be replaced

## 4. Important product principle

The system should explain *why* a stock or mutual fund passes or fails rather than showing only a Buy/Hold/Avoid label.
