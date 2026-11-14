# Mutual Fund Analysis

## Objective

Select and monitor a maximum of four mutual funds according to the user's long-term SIP strategy.

## Target portfolio

| Category | Target |
|---|---:|
| Nifty Index / Nifty Next 50 Index | 30% |
| Multi-cap | 30% |
| Mid & Small-cap | 30% |
| Debt / Money Market | 10% |

## Analysis parameters

### Fund quality

- Category
- Benchmark
- Expense ratio
- Exit load
- AUM
- Fund age
- Portfolio turnover
- Tracking error for index funds
- Active-share characteristics where relevant

### Performance

Analyze:

- 1Y
- 3Y
- 5Y
- Since inception where meaningful
- Rolling returns
- Benchmark comparison
- Category comparison

Do not select a fund only because of recent returns.

### Risk

Analyze:

- Standard deviation
- Sharpe ratio
- Sortino ratio
- Maximum drawdown
- Downside capture
- Portfolio concentration
- Credit quality for debt funds
- Duration for debt funds

### Portfolio overlap

Calculate overlap among the selected equity funds.

Flag high overlap so that four schemes do not accidentally provide the same exposure.

## Rule engine

Check:

- Maximum four schemes
- Target allocation
- SIP status
- Long-term horizon
- Category suitability
- Portfolio overlap
- Cost
- Risk

Output:

- PASS
- WARNING
- FAIL
- NOT_ENOUGH_DATA
