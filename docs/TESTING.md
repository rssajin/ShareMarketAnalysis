# Testing Strategy

## Unit tests

Priority:

1. Stock score calculation
2. Stock rule evaluation
3. Portfolio allocation calculation
4. Mutual-fund allocation calculation
5. SIP schedule
6. Alert conditions
7. Tax-estimation inputs
8. Provider response normalization

## Integration tests

- PostgreSQL
- REST APIs
- MCP adapters
- Authentication
- Synchronization workflows

## Frontend tests

- Dashboard rendering
- Rule status rendering
- Stock score display
- Portfolio allocation calculations
- Alert popup behavior
- API error states

## Test cases that must exist

### Stock

- All metrics pass
- Multiple metrics fail
- Missing data
- Extreme valuation
- Negative FCF
- Promoter pledge > 0
- AI vulnerable

### Portfolio

- Exact allocation
- Allocation drift
- Missing market price
- New holding
- Sold holding

### Mutual funds

- Four-fund maximum
- Fifth fund violation
- High overlap
- SIP date calculation
- Category allocation drift

## Principle

Financial calculations should use deterministic tests with known fixtures and decimal-safe arithmetic.
