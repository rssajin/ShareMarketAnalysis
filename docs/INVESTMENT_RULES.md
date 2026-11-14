# Investment Rules

This document is the source of truth for the initial portfolio rule engine.

## 1. Equity

### Horizon

Long-term equity horizon: 3–10 years.

### Allocation

Target:

| Asset | Target |
|---|---:|
| Large-cap stocks | 40% |
| Mid-cap stocks | 30% |
| Small-cap stocks | 20% |
| Gold/Silver ETF | 10% |

The application should allow tolerance bands to be configured rather than assuming an exact percentage.

### Large-cap rule

Large-cap stocks are intended for long-term holding.

The system should not automatically sell a large-cap stock only because it reaches a particular return.

### Mid/small-cap profit rule

The user's stated rule is:

> If a small- or mid-cap stock reaches 10–15% returns, sell the stock to reduce risk.

Implement this as a configurable rule because the exact trigger needs to support:
- minimum return threshold
- maximum return threshold
- holding period
- optional manual confirmation

Do not silently execute a sell order.

### Stock quality preferences

Prefer businesses with:

- Growth potential
- Strong business idea/model
- Clear action/growth plans
- Better financial results
- Strong cash flow
- Low or zero debt
- Durable competitive advantage
- Manageable AI disruption risk

## 2. Mutual funds

### SIP

Monthly SIP is the preferred investment method.

### Horizon

Target investment period: 15 years.

### Maximum funds

Maximum: 4 mutual-fund schemes.

### Target allocation

| Category | Target |
|---|---:|
| Nifty Index / Nifty Next 50 Index | 30% |
| Multi-cap fund | 30% |
| Mid & Small-cap fund | 30% |
| Debt / Money Market fund | 10% |

### Post-SIP tax rule

The user's requirement says to complete the 15-year SIP and wait one year after the last purchase to avoid tax.

This must **not** be implemented as a tax guarantee. Indian capital-gains taxation depends on the applicable security, purchase lot, holding period, tax law, and redemption details.

The application should instead provide:
- SIP end date
- Each purchase lot's date
- Eligible holding-period status
- Estimated tax using a configurable tax engine
- A disclaimer that tax rules can change

## 3. Portfolio compliance

For every rule, calculate:

- Current value
- Target value/percentage
- Difference
- Status
- Reason
- Suggested action

Statuses:

- PASS
- WARNING
- FAIL
- NOT_ENOUGH_DATA

## 4. No automatic trading

The first release is analysis and decision support.

Order execution must require explicit user confirmation and should be isolated behind a separate trading capability.
