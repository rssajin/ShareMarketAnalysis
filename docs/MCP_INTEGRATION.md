# MCP Integration

## Goal

Connect investment accounts and supported data sources through MCP-compatible adapters.

Initial targets:

- Zerodha Kite / Coin MCP
- Groww MCP

## Design

Do not allow the business logic to depend directly on a specific MCP implementation.

Use:

```text
MCP Client
   |
   +--> ZerodhaAdapter
   |
   +--> GrowwAdapter
   |
   +--> FutureProviderAdapter
```

All adapters implement a common domain interface.

## Suggested interfaces

```text
BrokerPortfolioProvider
  getHoldings()
  getPositions()
  getTransactions()

MarketDataProvider
  getQuote()
  getHistoricalPrices()
  getFinancialMetrics()
  getCorporateActions()

MutualFundProvider
  getFundDetails()
  getNAVHistory()
  getHoldings()
  getExpenseData()
```

## Security

- OAuth/token-based authentication where supported
- Store credentials/secrets in a secret manager
- Never log access tokens
- Encrypt sensitive data at rest
- Apply least privilege
- Add provider connection status
- Support disconnect/revoke

## Synchronization

Each sync should have:

- provider
- startedAt
- completedAt
- status
- recordsRead
- recordsUpdated
- errorMessage
- correlationId

## Important

MCP server capabilities can vary. Implement capability discovery and graceful degradation rather than assuming every provider exposes the same tools.
