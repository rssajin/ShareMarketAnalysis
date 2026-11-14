# Antigravity Agent Instructions

## Mission

Build a production-quality web application for Indian stock and mutual-fund analysis using the requirements in this repository.

## Rules

1. Read `docs/PROJECT_REQUIREMENTS.md` before implementing features.
2. Treat `docs/INVESTMENT_RULES.md` as the source of truth for portfolio rules.
3. Treat `docs/STOCK_ANALYSIS.md` as the source of truth for stock scoring.
4. Treat `docs/MUTUAL_FUND_ANALYSIS.md` as the source of truth for mutual-fund analysis.
5. Never hard-code market values, prices, ratios, holdings, or returns.
6. Separate raw market data, calculated metrics, user rules, recommendations, and AI-generated explanations.
7. Every recommendation must show the important reasons and failed checks.
8. Recommendations are decision-support only; do not present them as guaranteed returns.
9. MCP credentials/secrets must never be committed to source control.
10. Add tests for investment-rule calculations and scoring logic before UI integration.
11. Prefer small, modular services and typed API contracts.
12. Preserve an audit trail for recommendation inputs and calculated scores.

## Suggested implementation order

1. Domain model
2. Rule engine
3. Stock scoring engine
4. Mutual-fund scoring engine
5. Portfolio analysis
6. Market-data adapters
7. MCP adapters
8. Backend APIs
9. Frontend dashboard
10. Alerts
11. AI qualitative analysis
12. Observability and hardening

## Sccurity policy
Read `docs/Security Policy — Database & MCP Server Data `

Project creation steps:
1 -> create web application without MCP server connect. data retrive from websites.
2 -> connect MCP server
3 -> database save
4 -> project deployment

 step 1 done thanks.
 step 2,4 please skip

current requirnment:
 check nifty50,nifty200,bsc100,nifty500 any other intrestiing stocks in large cap

 filter our score 90 above category A, 85-90 category B, 80-85 category C

 check mid cap stocks  
 category based above score A, B, C

 check small cap stocks  
 category based above score A, B, C

 add new submenu for this.

 current potfolio data keep it safe. don't remove

 current requirements done thanks

 i need add stock analysis screen add watch list button. that data add in watch list screen.

 i need new watch list screen.


 also i need chat window for type prompt particularly  for stock,mutual fund, commodity analysis give me more filter and combination on search buttons for refine and select category.

 done thanks

 please do step 3 
 necessary data only save to db like 
 watchlist
 done thanks

 requirement:
 please add Priority 10 Investment Checks add in 100 point quality score in stock analysis
 done thanks


new requirement:
add products and service of stock  and percentage of revenue from the service add extra card 
  
## optimize llm usage
avoid run stop the application
test api no need now just skip. 
avoid change entire application just add feature.

### Index Stock Filter Menu

Add one new menu to the existing application: **"Index Stock Scanner"**.

This menu should:

1. Display the available **NSE and BSE indexes**.
2. Allow the user to select an NSE/BSE index.
3. Display the stocks/components belonging to the selected index.
4. Run the **existing stock analysis conditions and scoring logic** on those stocks.
5. Filter and display only stocks with an **analysis score greater than 80**.
6. Do not create a new analysis/scoring methodology. Reuse the existing stock-analysis conditions already implemented in the application.
7. Do not hard-code stock prices, index constituents, financial data, or analysis scores. Use the configured market-data sources.
8. Show the results in a table with at least:

   * Stock Name
   * Symbol
   * Exchange
   * Index
   * Current Price
   * Analysis Score
   * Recommendation
   * Last Updated
9. Provide filters for:

   * NSE / BSE
   * Index
   * Analysis Score
   * Sector, if available
10. Default result condition must be:

**Analysis Score > 80**

Example user flow:

**Index Stock Scanner → NSE → NIFTY 500 → Run Existing Analysis → Show stocks with Score > 80**

The new menu must integrate with the existing application architecture and must not break or modify existing menus and functionality.

# New Feature: Today's Stock Opportunities

## 1. Objective

Add a new screen named **"Today's Stock Opportunities"** to the existing Indian stock and mutual fund analysis application.

The screen should analyze stocks already available in the existing Watchlist and identify:

1. Reasonably valued stocks that may be worth considering for purchase.
2. Stocks that meet the existing quality and valuation criteria.
3. Stocks that may be candidates for holding, accumulating, reducing, or selling.
4. Stocks with attractive valuations relative to their financial performance and business quality.
5. Opportunities across large-cap, mid-cap, small-cap, and micro-cap categories.

The objective is to support disciplined, valuation-based investment decisions rather than simply selecting stocks with the lowest share prices.

## 2. Mandatory Existing-Application Rules

Before implementation:

1. Read `docs/PROJECT_REQUIREMENTS.md`.
2. Read `docs/INVESTMENT_RULES.md`.
3. Read `docs/STOCK_ANALYSIS.md`.
4. Read `docs/MUTUAL_FUND_ANALYSIS.md`.
5. Read the existing database and security policy documentation.
6. Inspect the current Watchlist implementation, stock-analysis engine, scoring logic, market-data adapters, portfolio management, and frontend navigation.
7. Reuse the existing domain models, API contracts, stock-analysis conditions, quality scores, and valuation calculations wherever possible.

### Preserve Existing Functionality

* Do not rebuild the entire application.
* Do not modify existing screens unnecessarily.
* Do not remove or overwrite existing portfolio data.
* Do not delete watchlist entries or user-defined investment rules.
* Do not create a separate stock-scoring methodology when an existing implementation is available.
* Do not introduce a new database unless the existing architecture genuinely requires it.
* Do not connect new MCP servers as part of this feature.
* Do not change existing application startup, deployment, or configuration processes unnecessarily.
* Do not run or restart the application repeatedly.
* Do not perform unnecessary API calls or expensive LLM operations.
* Do not run tests that require external APIs or paid services unless explicitly requested.
* Keep the implementation modular and limited to this feature.

## 3. New Navigation Menu

Add a new menu item:

**Today's Stock Opportunities**

The screen should contain the following sections:

1. Opportunity Summary
2. Today's Buy Candidates
3. Hold / Watch Candidates
4. Sell / Reduce Candidates
5. Market-Cap Categories
6. Filters and Sorting
7. Analysis Details

Use the existing application layout, design system, authentication, routing, and navigation conventions.

Do not change existing menu items.

## 4. Data Source: Existing Watchlist

Use the current Watchlist as the primary source of stocks for analysis.

Processing workflow:

1. Retrieve existing watchlist entries using the current application's data-access layer.
2. Obtain the latest available market data from the configured market-data sources.
3. Retrieve the financial metrics required by the existing analysis engine.
4. Run the existing stock-quality scoring and valuation logic.
5. Apply the investment rules defined in the documentation.
6. Categorize the results.
7. Display the results in the new screen.

Requirements:

* Do not hard-code stock symbols, prices, financial metrics, market capitalization, or scores.
* Do not use fabricated market data when a source is unavailable.
* Do not treat missing financial data as a passing investment check.
* Display the market-data timestamp and data freshness.
* Clearly distinguish unavailable, stale, and verified data.
* Reuse existing market-data adapters and caching mechanisms.

The initial implementation must analyze watchlist stocks only. Do not automatically scan every stock on the market.

## 5. Generate / Start Analysis Button

Add a prominent button:

**Generate Today's Opportunities**

Alternative label: **Start Analysis**

When the user clicks the button:

1. Validate the selected filters.
2. Retrieve the existing watchlist.
3. Fetch or reuse cached market data.
4. Calculate the latest available valuation metrics.
5. Run the existing stock-analysis engine.
6. Apply the existing investment rules.
7. Classify the results into buy candidates, hold/watch candidates, and sell/reduce candidates.
8. Sort the results according to the selected sorting criteria.
9. Display the results with the analysis timestamp.

### Processing Requirements

* Do not start analysis automatically on every page render.
* Do not repeatedly fetch identical data unnecessarily.
* Reuse existing cached data when it is sufficiently fresh.
* Show progress, completion status, and useful error messages.
* Prevent duplicate analysis jobs caused by repeated button clicks.
* Handle API rate limits, timeouts, and partial data failures.
* Do not block the entire application while analysis is running.
* Do not restart the application to run an analysis.
* Do not invoke an LLM for calculations that can be performed deterministically.
* Use the existing application architecture for background processing if available.
* If the application already supports scheduled jobs, reuse that capability rather than introducing a new scheduler.

## 6. Opportunity Summary Cards

Display summary cards for:

* Total watchlist stocks.
* Stocks successfully analyzed.
* Potential buy candidates.
* Hold/watch candidates.
* Potential sell/reduce candidates.
* Stocks with incomplete or stale data.
* Last analysis timestamp.

These figures must be calculated from the actual analysis results.

Do not count a stock as successfully analyzed when essential data is missing.

## 7. Today's Buy Candidates

Create a dedicated section for stocks that pass the existing quality, valuation, and investment-rule checks.

Display the following columns:

* Company Name
* Symbol
* Exchange
* Sector
* Market-Cap Category
* Current Market Price
* Stock Quality Score
* Existing Analysis Grade
* Valuation Status
* Estimated Fair Value, if supported
* Margin of Safety, if supported
* P/E Ratio
* P/B Ratio, where relevant
* ROE
* ROCE
* Debt-to-Equity
* Earnings Growth
* Revenue Growth
* Dividend Yield, where relevant
* Potential Entry Price or Entry Range, if supported
* Risk Level
* Failed Checks
* Last Updated

Reuse the existing score and analysis grade.

Do not invent fair values, entry prices, or valuation ratios when the existing analysis engine cannot calculate them reliably.

### Buy-Candidate Eligibility

A stock should qualify as a potential buy candidate only when it satisfies the existing investment rules.

Consider:

1. Business quality.
2. Reasonable valuation.
3. Financial strength.
4. Profitability.
5. Earnings and revenue growth.
6. Debt and balance-sheet risk.
7. Cash-flow quality.
8. Governance and disclosure concerns, where data is available.
9. Liquidity and volatility risks.
10. Existing Priority 10 Investment Checks.
11. Existing 100-point stock-quality score.
12. Existing failed-check and exclusion rules.

A high quality score alone must not automatically make an expensive stock a buy.

A low valuation alone must not automatically make a weak or financially distressed stock a buy.

If the existing rules require a minimum score of 80, preserve that requirement. Apply any stricter existing rule where applicable.

Use the existing scoring methodology instead of creating another scoring system.

## 8. Cheapest-First Sorting

Provide the following sorting options:

1. Cheapest Relative to Estimated Fair Value
2. Highest Margin of Safety
3. Lowest P/E Ratio
4. Lowest P/B Ratio
5. Highest Quality Score
6. Highest Earnings Growth
7. Highest ROCE
8. Lowest Debt-to-Equity
9. Lowest Current Market Price
10. Lowest Risk Among Eligible Candidates

### Default Sorting

Default to:

**Most Undervalued Eligible Stocks First**

The preferred sorting method is based on valuation relative to estimated fair value or margin of safety, provided the existing analysis engine supports reliable calculations.

Do not use nominal share price as the default measure of cheapness.

For example, a stock trading at ₹50 is not necessarily cheaper than a stock trading at ₹2,000.

A stock is potentially attractive when its price is reasonable relative to its earnings, assets, cash flows, growth prospects, and business risks.

If fair value is unavailable, fall back to a supported valuation metric and clearly label the sorting method.

Never compare P/E or P/B ratios across unrelated industries without considering sector differences.

## 9. Hold / Watch Candidates

Create a separate section for stocks that do not currently qualify as buy candidates but may remain suitable for monitoring.

Possible reasons:

* Good business but expensive valuation.
* Attractive valuation but insufficient confirmation.
* Quality score below the buy threshold.
* Missing or stale financial information.
* Temporary earnings weakness.
* Uncertain business outlook.
* High volatility.
* Price not yet within the preferred entry range.
* Some investment checks require further review.

Display:

* Company Name
* Symbol
* Current Price
* Quality Score
* Valuation Status
* Preferred Entry Price or Range, if supported
* Reason for Watchlist Classification
* Failed Checks
* Risk Level
* Last Updated

Do not classify a stock as a buy simply because it is already in the user's watchlist.

## 10. Sell / Reduce Candidates

Create a dedicated section for stocks that may require further review for reducing or selling an existing position.

Distinguish between:

1. Stocks currently held in the user's portfolio.
2. Stocks present only in the watchlist.

### Potential Sell / Reduce Signals

Use the existing investment rules to identify signals such as:

* Material deterioration in business fundamentals.
* Persistent earnings or revenue deterioration.
* Excessive debt or worsening interest coverage.
* Significant cash-flow quality problems.
* Serious governance concerns supported by reliable data.
* Valuation significantly above a defensible estimated fair value.
* A stock no longer meeting the user's investment criteria.
* A portfolio concentration or risk-limit breach.
* A change that invalidates the original investment thesis.

For portfolio holdings, consider purchase price, holding period, position size, investment thesis, and tax implications when those details are available and relevant.

### Required Display Fields

* Company Name
* Symbol
* Current Price
* Existing Quality Score
* Previous Quality Score, if recorded
* Score Change
* Current Valuation
* Sell / Reduce Signal
* Reason for Signal
* Failed Checks
* Fundamental Deterioration Indicators
* Risk Level
* Last Updated

### Important Safeguards

* Do not recommend selling merely because a stock price has declined.
* Do not recommend buying merely because a stock price has declined.
* Do not recommend selling solely because a target price was reached without considering the investment thesis and valuation.
* Distinguish valuation concerns from deterioration in business quality.
* Do not infer portfolio ownership from watchlist membership.
* Do not assume that every watchlist stock is owned by the user.
* Never execute trades or place orders.
* Display all results as decision-support signals, not guaranteed outcomes.

## 11. Market-Capitalization Categories

Provide filters and separate views for:

1. Large Cap
2. Mid Cap
3. Small Cap
4. Micro Cap

Use actual market-cap data and the applicable classification rules.

For Indian mutual funds, use the relevant SEBI/AMFI classification framework for large-cap, mid-cap, and small-cap companies where applicable.

For direct stock analysis, distinguish the mutual-fund classification framework from any other market-cap classification used by the application.

Micro-cap is not a standard SEBI mutual-fund equity category in the same way as large-cap, mid-cap, and small-cap. Define the application's micro-cap classification explicitly, document its source and thresholds, and do not misrepresent it as an official SEBI category.

Do not hard-code a company's category permanently. Use the current classification data available from configured sources.

If classification data is missing, show "Unclassified" rather than guessing.

### Category Filters

Allow users to select:

* All Categories
* Large Cap
* Mid Cap
* Small Cap
* Micro Cap
* Unclassified

Support combinations with sector, exchange, quality score, and valuation filters.

### Category-Specific Risk Handling

Large Cap:

* Focus on business quality, valuation, earnings consistency, and capital allocation.

Mid Cap:

* Give additional attention to growth sustainability, debt, cash flow, and valuation risk.

Small Cap:

* Give additional attention to liquidity, governance, promoter-related risks where reliable data is available, earnings volatility, and cash-flow consistency.

Micro Cap:

* Apply stricter data-quality and liquidity checks.
* Highlight price volatility, limited financial history, concentration risks, and potential difficulty exiting a position.
* Do not treat a high score as sufficient evidence of suitability.

Reuse the existing scoring engine. Any category-specific rules must be consistent with the existing investment documentation.

## 12. Valuation and Fundamental Analysis

Reuse the existing stock-analysis implementation and consider the following metrics when supported by reliable data.

### Valuation

* P/E Ratio
* Forward P/E, if reliable estimates are available
* P/B Ratio
* EV/EBITDA
* Price-to-Sales, where appropriate
* Dividend Yield
* Estimated Fair Value
* Margin of Safety
* Historical Valuation Range
* Sector-Relative Valuation

Do not use every metric for every company.

For example:

* P/B can be more useful for some financial businesses.
* EV/EBITDA can be useful for comparing certain operating businesses.
* P/E may be misleading when earnings are negative, unusually high, or temporarily depressed.
* Dividend yield should be assessed alongside dividend sustainability.

### Financial Quality

* Revenue Growth
* Profit Growth
* Earnings Per Share Growth
* ROE
* ROCE
* Operating Margin
* Net Profit Margin
* Operating Cash Flow
* Free Cash Flow, where supported
* Debt-to-Equity
* Interest Coverage
* Working Capital Trends
* Share Dilution
* Return on Invested Capital, where available

### Business and Governance Risk

Where reliable information is available, consider:

* Promoter pledge levels.
* Related-party transaction concerns.
* Auditor qualifications or resignations.
* Regulatory actions.
* Material litigation disclosures.
* Unusual changes in receivables or inventory.
* Repeated negative operating cash flow.
* Significant dilution.
* Material changes in the business model.

Missing information must be identified as unknown, not automatically interpreted as good or bad.

Do not invent qualitative findings.

## 13. Buy-Price and Margin-of-Safety Analysis

When the existing valuation engine supports fair-value estimation, display a potential entry range.

The calculation should follow the existing valuation rules and documented assumptions.

For example, a margin-of-safety calculation may be:

Margin of Safety (%) = ((Estimated Fair Value - Current Market Price) / Estimated Fair Value) × 100

Use this formula only when the estimated fair value is positive and meaningful.

The required margin of safety may vary by business quality, valuation uncertainty, financial risk, and applicable investment rules.

Do not apply an arbitrary universal discount to all stocks.

Clearly display:

* Estimated Fair Value
* Current Price
* Margin of Safety
* Valuation Method
* Key Assumptions
* Data Date
* Confidence or Reliability Indicator, if supported

A fair-value estimate is uncertain and must not be presented as a guaranteed future price.

If a reliable fair value cannot be estimated, show "Not Available" and use supported alternative valuation metrics.

## 14. Scoring and Decision Rules

Use the existing 100-point stock-quality scoring system, including Priority 10 Investment Checks.

Do not add a separate scoring engine.

For each stock, display:

* Existing Quality Score
* Existing Grade
* Important Positive Factors
* Failed Checks
* Missing Data
* Valuation Status
* Fundamental Risks
* Final Classification
* Classification Reason

Keep these concepts separate:

1. Business Quality Score
2. Valuation Assessment
3. Risk Assessment
4. Buy/Hold/Sell Decision Signal

Do not confuse an excellent business with an attractive current purchase price.

A company may have a high quality score and still be overvalued.

A company may have a low valuation multiple and still be a poor investment.

The final classification must follow the existing documented investment rules.

If required data is missing, do not allow the stock to pass the affected check.

## 15. Filters and Search

Provide interactive filters for:

* Market-Cap Category
* NSE / BSE
* Sector
* Minimum Quality Score
* Maximum P/E, where appropriate
* Maximum P/B, where appropriate
* Minimum ROCE
* Minimum Revenue Growth
* Minimum Earnings Growth
* Maximum Debt-to-Equity
* Minimum Margin of Safety
* Valuation Status
* Risk Level
* Buy / Hold / Sell Signal
* Data Freshness

Filters must be combinable.

Allow users to reset filters and return to the default view.

Ensure that filter combinations work correctly with sorting and pagination.

Do not make additional market-data requests every time a client-side filter changes if the required data is already available.

## 16. Audit Trail and Analysis History

Maintain an audit trail using the existing audit architecture.

For each completed analysis, preserve the information necessary to explain the result:

* Analysis timestamp
* Stock symbol and exchange
* Source-data timestamps
* Quality score
* Valuation metrics
* Applicable investment-rule version
* Passed checks
* Failed checks
* Missing data
* Final classification
* Reason for classification

Reuse existing persistence capabilities where possible.

Do not create permanent database records for every intermediate calculation unless required by the existing architecture.

Avoid duplicating market data unnecessarily.

Keep the existing portfolio and watchlist data safe.

## 17. Database Requirements

Use the existing database architecture.

Do not introduce a new database for this feature without a clear technical necessity.

Persist only information that is genuinely needed, such as:

* Existing watchlist data, if already stored there.
* User-selected filters or preferences, if required.
* Analysis history or audit information, if supported by the existing architecture.

Do not store duplicate copies of the watchlist.

Do not store market data permanently merely because it was fetched for one analysis.

Follow the existing security policy for database access and sensitive information.

## 18. LLM Usage Optimization

Use deterministic calculations for:

* Stock scoring
* Valuation ratios
* Margin-of-safety calculations
* Category classification
* Filter processing
* Sorting
* Buy/Hold/Sell rule evaluation
* Risk thresholds

Do not use an LLM to perform calculations that can be implemented using ordinary application code.

Invoke AI qualitative analysis only when it adds meaningful value, such as summarizing a company's business risks or explaining complex financial disclosures.

Reuse existing LLM services and configurations.

Do not create a new LLM client or introduce another model dependency unnecessarily.

Do not invoke an LLM separately for every stock when a deterministic or batched workflow is sufficient.

Do not expose secrets or send sensitive portfolio information to external AI providers without following the existing security policy.

## 19. UI and User Experience

Use the existing frontend framework and design system.

The screen should include:

* A Generate Today's Opportunities button.
* An analysis progress indicator.
* A last-updated timestamp.
* Summary cards.
* Separate Buy, Hold/Watch, and Sell/Reduce sections.
* Market-cap category filters.
* Sorting controls.
* Expandable stock-analysis details.
* Clear explanations of passed and failed checks.
* Empty states when no stock qualifies.
* Error messages for unavailable data.
* A clear indication when data is stale or incomplete.

Do not display a buy candidate merely to fill an empty table.

If no stock meets the criteria, display:

"No stocks currently meet the selected investment criteria."

## 20. Performance and Reliability

* Reuse existing API clients and market-data adapters.
* Apply caching where appropriate.
* Avoid unnecessary network calls.
* Respect provider rate limits.
* Handle partial failures without losing successful results.
* Avoid blocking the user interface.
* Avoid repeated database queries when results can be reused.
* Do not introduce unnecessary background services.
* Do not run or restart the application repeatedly.
* Avoid unrelated dependency upgrades.
* Keep changes small and modular.

## 21. Testing Requirements

Do not execute external API tests or tests requiring paid services unless explicitly requested.

Before implementation, inspect the existing test setup.

Add or update focused tests for new deterministic logic where practical, particularly:

* Market-cap classification.
* Margin-of-safety calculations.
* Sorting order.
* Filter combinations.
* Buy/Hold/Sell classification.
* Missing-data handling.
* Stale-data handling.
* Preservation of existing watchlist entries.

Use mocks or fixtures for market-data responses.

Do not require live market access to validate deterministic calculations.

Do not claim tests passed unless they were actually executed successfully.

## 22. Implementation Plan

Implement this feature incrementally:

1. Inspect the current project architecture and documentation.
2. Identify the existing watchlist API and data model.
3. Identify the existing stock-analysis and scoring engine.
4. Identify the existing valuation calculations and market-data adapters.
5. Design the smallest changes required.
6. Implement the analysis orchestration using existing services.
7. Implement the Buy, Hold/Watch, and Sell/Reduce classifications using existing rules.
8. Add market-cap categorization and filters.
9. Add the new frontend screen and navigation entry.
10. Add analysis history only if supported by the current architecture and required by the feature.
11. Add focused tests without calling paid external services.
12. Review the changes for security, data preservation, and unnecessary API or LLM usage.

Do not implement unrelated features.

Do not change existing application behavior outside the scope of this requirement.

## 23. Definition of Done

The feature is complete when:

* A new Today's Stock Opportunities screen is available.
* The existing Watchlist supplies the stocks for analysis.
* The user can manually start analysis.
* The application uses the existing stock-quality scoring engine.
* The application displays potential buy, hold/watch, and sell/reduce candidates separately.
* Eligible stocks can be sorted by supported valuation metrics.
* Large-cap, mid-cap, small-cap, and micro-cap filters work.
* The screen shows the quality score and explains important failed checks.
* Missing or stale data is handled transparently.
* Existing portfolio data and watchlist entries remain intact.
* Existing menus and functionality continue to work.
* No trades are executed automatically.
* Unnecessary LLM calls and market-data requests are avoided.
* No unrelated application changes are introduced.


Slategrey:
Buy a good company at an attractive valuation → Hold while the business remains healthy → Review periodically → Sell partially when justified → Reinvest in another attractive opportunity.

import file in watchlist screen

import botton for import csv data
format :
symbol,company_name,market_cap_type
LUPIN,Lupin,Large Cap
BAJAJ-AUTO,Bajaj Auto,Large Cap

remove all button from watchlist screen
