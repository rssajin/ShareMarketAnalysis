# Configuration

Keep investment rules configurable.

Example conceptual configuration:

```yaml
investment:
  equity:
    allocation:
      largeCap: 0.40
      midCap: 0.30
      smallCap: 0.20
      preciousMetalEtf: 0.10
    midSmallCapReturnReview:
      enabled: true
      minPercent: 10
      maxPercent: 15

  mutualFunds:
    maxFunds: 4
    allocation:
      index: 0.30
      multiCap: 0.30
      midSmallCap: 0.30
      debtMoneyMarket: 0.10
    horizonYears: 15

analysis:
  stock:
    minimumCandidateScore: 70
```

Do not hard-code these values in controllers or UI components.

Store user-specific overrides separately from application defaults.
