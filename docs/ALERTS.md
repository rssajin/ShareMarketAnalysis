# Alert and Notification Rules

## Portfolio allocation

Trigger when allocation exceeds configured tolerance.

Example:

```text
Target: Large cap 40%
Actual: 47%
Status: FAIL
```

## Stock deterioration

Alert when previously strong metrics materially deteriorate:

- ROE/ROCE decline
- Profit growth deterioration
- FCF turns negative
- Debt increases significantly
- Promoter pledge appears/increases
- Governance warning
- Valuation becomes extreme

## Small/mid-cap return rule

Alert when a configured 10–15% return threshold is reached.

The alert should recommend review/sale according to the user's rule but must not execute a trade automatically.

## Mutual-fund drift

Alert when any category moves outside its configured tolerance.

## Notification channels

Phase 1:

- In-app popup
- Notification center

Future:

- Email
- Push
- WhatsApp/other channels if legally and technically appropriate
