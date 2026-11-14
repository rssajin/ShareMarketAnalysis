# Security Analysis & Recommended Features for Share Market Analysis App

## Overview
The Share Market Analysis application is a client‑side web app that fetches market data, performs stock/mutual‑fund scoring, and stores user‑specific data (watch‑list, portfolio) locally or in a future backend.

## Threat Model
| Asset | Potential Threat | Impact | Likelihood |
|-------|------------------|--------|------------|
| Market‑data API keys | Leakage or abuse | High (cost, compliance) | Medium |
| User watch‑list / portfolio data | Unauthorized access or tampering | Medium (privacy) | Low |
| UI input (prompts) | XSS, injection via malformed data | High (code execution) | Low |
| Deployment (Firebase Hosting) | Mis‑configuration, open bucket | Medium (data exposure) | Low |

## Required Security Controls
1. **API Key Protection**
   - Store any third‑party API keys **off‑client** (e.g., in Firebase Functions or a secure backend). Do **not** embed keys in the static bundle.
   - Use environment variables in CI/CD and Firebase Functions config (`functions.config()`).
2. **Content Security Policy (CSP)**
   - Add a strict CSP header via `firebase.json` rewrites or a custom `firebase.json` `headers` section:
   ```json
   {
     "source": "**/*.html",
     "headers": [
       { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'sha256-…'; style-src 'self' 'unsafe-inline'; img-src 'self' data:" }
     ]
   }
   ```
3. **Secure Storage of User Data**
   - Prefer **Firebase Firestore** with security rules that enforce `request.auth != null` and limit reads/writes to the authenticated user’s UID.
   - If staying fully client‑side, encrypt data in `localStorage` using a per‑user secret derived from a password.
4. **Input Validation & Sanitisation**
   - Escape any data rendered into the DOM (e.g., use libraries like DOMPurify).
   - Validate API responses against a known schema before using them.
5. **HTTPS Everywhere**
   - Firebase Hosting serves over HTTPS by default; ensure all external calls use `https://` endpoints.
6. **Authentication & Authorization**
   - Integrate **Firebase Authentication** (email/password, Google, etc.) for user‑specific features.
   - Guard routes on the client and in Firestore rules.
7. **Rate Limiting & Abuse Prevention**
   - If you expose a backend (e.g., Functions) for market‑data fetching, enforce per‑user quotas.
8. **Logging & Monitoring**
   - Enable Firebase **Performance Monitoring** and **Cloud Logging** for unusual activity.
9. **Dependency Hygiene**
   - Keep npm dependencies up‑to‑date; run `npm audit` and fix vulnerabilities.
10. **Secure Deployment Configuration**
    - Disable public read/write on any Cloud Storage buckets used.
    - Use `firebase deploy --only hosting` for the static site; keep functions separate.

## Checklist for the Current Project
- [ ] Move any market‑data API keys to Firebase Functions or environment config.
- [ ] Add a CSP header in `firebase.json`.
- [ ] Enable Firebase Auth and protect Firestore data with rules.
- [ ] Integrate DOMPurify for any HTML rendering of external data.
- [ ] Run `npm audit` and address findings.
- [ ] Verify all external URLs use HTTPS.
- [ ] Add Cloud Logging for any server‑side endpoints.

## References
- Firebase Security Rules: https://firebase.google.com/docs/rules
- OWASP Top 10 for SPAs: https://owasp.org/www-project-top-ten/
- Content Security Policy MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

---
*Generated on 2026‑10‑14 for internal review.*
