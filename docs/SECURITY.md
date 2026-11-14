# Security Requirements

## Authentication

Use secure authentication with short-lived access tokens and appropriate refresh-token handling.

## Authorization

Users must only access their own portfolios, holdings, analysis, alerts, and integrations.

## Secrets

Never store:

- API keys in source code
- Broker tokens in Git
- MCP credentials in frontend code

Use environment variables or a secret manager.

## Data protection

Protect:

- Account identifiers
- Portfolio values
- Transaction data
- Provider credentials

## Logging

Never log:

- Access tokens
- Refresh tokens
- Passwords
- Sensitive account credentials

## External integrations

Apply:

- Timeouts
- Retry with backoff
- Rate limiting
- Circuit breakers where appropriate
- Provider health checks

## Trading safety

Analysis and trading should be separate permissions/capabilities.

No order should be submitted automatically from an analysis recommendation.
