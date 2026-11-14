# API Specification

Initial REST API.

## Portfolio

`GET /api/v1/portfolios`

`GET /api/v1/portfolios/{portfolioId}`

`GET /api/v1/portfolios/{portfolioId}/holdings`

`GET /api/v1/portfolios/{portfolioId}/analysis`

`GET /api/v1/portfolios/{portfolioId}/rule-results`

## Stocks

`GET /api/v1/stocks/search?q=`

`GET /api/v1/stocks/{symbol}`

`GET /api/v1/stocks/{symbol}/analysis`

`GET /api/v1/stocks/{symbol}/competitors`

`GET /api/v1/stocks/{symbol}/history`

## Watchlist

`GET /api/v1/watchlist`

`POST /api/v1/watchlist`

`POST /api/v1/watchlist/import`

CSV imports accept `symbol,company_name,market_cap_type`. They store the supplied watchlist metadata only; market metrics and quality scores remain unavailable until populated by analysis. Re-importing updates supplied names and categories without clearing existing metrics or scores.

`DELETE /api/v1/watchlist/{symbol}`

## Mutual funds

`GET /api/v1/mutual-funds/search?q=`

`GET /api/v1/mutual-funds/{schemeCode}`

`GET /api/v1/mutual-funds/{schemeCode}/analysis`

## Recommendations

`GET /api/v1/recommendations/stocks`

`GET /api/v1/recommendations/mutual-funds`

Every recommendation should return:

- instrument
- score
- suitability
- passedChecks
- failedChecks
- warnings
- keyMetrics
- explanation
- dataAsOf

## Alerts

`GET /api/v1/alerts`

`POST /api/v1/alerts/{id}/acknowledge`

## Integrations

`GET /api/v1/integrations`

`POST /api/v1/integrations/{provider}/connect`

`POST /api/v1/integrations/{provider}/sync`

`DELETE /api/v1/integrations/{provider}`

## API principles

- Version all APIs.
- Use pagination.
- Return consistent error structures.
- Validate all input.
- Never expose provider secrets.
- Include `dataAsOf` for market information.
