# AI Analysis Agent

## Purpose

Use an AI agent for qualitative research while keeping numerical analysis deterministic.

## Inputs

- Company profile
- Financial metrics
- Historical trends
- Industry information
- Competitor metrics
- Business description
- Product information
- User's investment rules

## Outputs

The agent may generate:

- Business summary
- Growth thesis
- Moat assessment
- Industry risks
- Competitor comparison
- AI disruption reasoning
- Key risks
- Questions requiring deeper research

## Required output structure

```json
{
  "businessSummary": "...",
  "growthThesis": ["..."],
  "moatAssessment": "...",
  "aiRisk": "BENEFICIARY|NEUTRAL|VULNERABLE",
  "risks": ["..."],
  "dataGaps": ["..."],
  "confidence": 0.0
}
```

## Guardrails

- Do not invent financial figures.
- Distinguish facts from inference.
- Cite or identify source data when available.
- Never guarantee returns.
- Never place an order.
- Never override deterministic rule-engine results.
