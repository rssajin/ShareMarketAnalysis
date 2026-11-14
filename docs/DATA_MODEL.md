# Data Model

## Core entities

### User

- id
- email
- createdAt
- updatedAt

### Portfolio

- id
- userId
- name
- baseCurrency
- createdAt

### Holding

- id
- portfolioId
- instrumentId
- quantity
- averageCost
- currentPrice
- currentValue
- assetClass
- marketCapCategory

### Instrument

- id
- symbol
- exchange
- ISIN
- name
- instrumentType
- sector
- industry

### StockMetricsSnapshot

- id
- instrumentId
- snapshotDate
- roe
- roce
- salesCagr5Y
- profitCagr5Y
- epsCagr5Y
- debtEquity
- interestCoverage
- fcf
- cfo
- pat
- pe
- peg
- pb
- evEbitda
- promoterHolding
- promoterPledge
- price
- dma200

### StockAnalysis

- id
- instrumentId
- analysisDate
- businessQualityScore
- growthScore
- profitabilityScore
- financialStrengthScore
- cashFlowScore
- valuationScore
- managementScore
- moatScore
- totalScore
- aiRisk
- aiConfidence
- recommendation
- explanation

### MutualFund

- id
- schemeCode
- name
- category
- benchmark
- expenseRatio
- exitLoad

### MutualFundAnalysis

- id
- mutualFundId
- analysisDate
- returnScore
- riskScore
- costScore
- consistencyScore
- overlapScore
- totalScore

### PortfolioRuleResult

- id
- portfolioId
- ruleCode
- status
- actualValue
- targetValue
- variance
- explanation
- evaluatedAt

### Alert

- id
- userId
- portfolioId
- type
- severity
- title
- message
- createdAt
- acknowledgedAt

## Design principle

Keep raw provider data separate from normalized domain data and calculated analysis snapshots.
