# Security Policy

## 1. Purpose

This policy defines the security and privacy requirements for accessing, processing, and handling data retrieved from databases and MCP (Model Context Protocol) servers.

The data accessed through these systems may contain **confidential, sensitive, and personal information**. Such data must be handled strictly according to the principles defined below.

---

## 2. Access Policy

### Database Access

- Database access is **READ-ONLY**.
- The system must not perform:
  - `INSERT`
  - `UPDATE`
  - `DELETE`
  - `MERGE`
  - `TRUNCATE`
  - `DROP`
  - `ALTER`
  - Any other data-modifying operation
- Database credentials must never be exposed in application logs, prompts, responses, source code, or documentation.
- Only the minimum required data should be retrieved.

### MCP Server Access

- MCP server access is **READ-ONLY** unless explicitly authorized otherwise.
- MCP tools must not be used to modify, delete, create, or overwrite data.
- Only required MCP resources and tools should be accessed.
- MCP credentials, tokens, API keys, and connection details must remain confidential.

---

## 3. Confidential and Personal Data

All information retrieved from databases or MCP servers must be treated as:

- Confidential information
- Personal data
- Potentially sensitive business information
- Restricted internal information

Examples include, but are not limited to:

- Customer information
- Employee information
- Financial information
- Account information
- Contact information
- Business records
- Internal application data
- Database records
- MCP server resources
- Authentication information
- System configuration information

---

## 4. Data Usage Restrictions

Data obtained from databases or MCP servers:

1. Must be used **only for the authorized task**.
2. Must not be shared with unauthorized people or systems.
3. Must not be copied unnecessarily.
4. Must not be exported unless explicitly authorized.
5. Must not be published publicly.
6. Must not be used for unrelated purposes.
7. Must not be combined with external datasets unless explicitly authorized.

---

## 5. LLM / AI Training Restriction

Database and MCP server data are **NOT authorized for LLM training**.

The data must:

- Not be used to train an LLM.
- Not be used to fine-tune an LLM.
- Not be added to a training dataset.
- Not be used to create permanent model knowledge.
- Not be retained for model-training purposes.
- Not be used for improving or evaluating an LLM unless explicitly authorized.

AI/LLM processing must be limited to the specific authorized request and task.

---

## 6. External Sharing Restriction

Confidential and personal data retrieved from databases or MCP servers must **not be shared outside the authorized environment**.

Do not:

- Upload the data to public websites.
- Send the data to unauthorized third-party services.
- Include confidential records in public Git repositories.
- Post data in public forums.
- Include personal information in screenshots shared externally.
- Send database dumps or MCP responses to unauthorized users.

---

## 7. Prompt and Context Security

When using an LLM with database or MCP data:

- Provide only the minimum information required.
- Avoid exposing unnecessary personal information.
- Do not include credentials or secrets in prompts.
- Do not intentionally request unrelated confidential records.
- Do not expose complete database tables when only a subset is required.
- Mask or redact personal information whenever possible.

### Example

**Preferred:**

> Analyze the sales trend for the requested customer segment.

**Avoid:**

> Return the complete customer table including names, phone numbers, email addresses, addresses, and account details.

---

## 8. Sensitive Information Handling

Where possible, sensitive information should be:

- Masked
- Redacted
- Aggregated
- Anonymized
- Minimized

Example:

```text
Email:
john.doe@example.com
```

Preferred when the email is not required:

```text
Email:
j***@example.com
```

---

## 9. Logging Policy

Application and MCP logs must not contain:

- Passwords
- API keys
- Access tokens
- Database credentials
- Full personal information
- Confidential database records
- Sensitive MCP responses

Logs should contain only the minimum information necessary for troubleshooting and auditing.

---

## 10. Data Modification Protection

The system must enforce read-only behavior at multiple levels where practical.

Recommended controls:

1. Read-only database user.
2. Database permissions restricted to `SELECT`.
3. MCP tools restricted to read operations.
4. Application-level validation.
5. SQL query validation.
6. Audit logging.
7. Credential separation.

A read-only database account is strongly preferred over relying only on application-level restrictions.

---

## 11. SQL Security

Only read-only SQL statements are permitted.

### Allowed

```sql
SELECT *
FROM customer
WHERE customer_id = :customerId;
```

### Not Allowed

```sql
INSERT INTO customer (...);
```

```sql
UPDATE customer
SET name = ...
WHERE customer_id = ...;
```

```sql
DELETE FROM customer
WHERE customer_id = ...;
```

```sql
DROP TABLE customer;
```

---

## 12. MCP Security

MCP servers must be treated as controlled data-access systems.

Before using an MCP tool:

- Verify that the tool is read-only.
- Verify the requested resource is authorized.
- Avoid retrieving unnecessary data.
- Do not expose MCP credentials.
- Do not execute destructive or write operations.
- Do not bypass MCP access controls.

If an MCP server provides both read and write capabilities, the application should use only the authorized read operations.

---

## 13. Data Minimization

Always follow the principle:

> **Retrieve only what is necessary to complete the task.**

For example, if the task requires:

```text
Customer ID + Order Amount
```

do not retrieve:

```text
Customer ID
Name
Phone
Email
Address
Date of Birth
Bank Details
Password
Order History
```

unless those fields are explicitly required and authorized.

---

## 14. Security Boundaries

The following boundary must be maintained:

```text
Database / MCP Server
        |
        | READ-ONLY
        v
Authorized Application
        |
        | Minimum Required Data
        v
LLM / AI Processing
        |
        | Task-Specific Result
        v
Authorized User
```

Confidential source data must not be unnecessarily exposed beyond the required processing boundary.

---

## 15. Violation Handling

If unauthorized access, accidental disclosure, unexpected write capability, credential exposure, or suspicious MCP/database behavior is detected:

1. Stop the operation.
2. Do not continue accessing the affected data.
3. Do not attempt to hide or delete evidence.
4. Report the issue through the appropriate security process.
5. Rotate compromised credentials when required.
6. Review access permissions.

---

## 16. Core Security Principles

All database and MCP integrations must follow these principles:

- **Read-only access**
- **Least privilege**
- **Data minimization**
- **Confidentiality**
- **Privacy**
- **No unauthorized external sharing**
- **No LLM training**
- **No unnecessary data retention**
- **Credential protection**
- **Auditability**

---

## 17. Mandatory Rule

> **Database and MCP server data is confidential and personal data. Access is READ-ONLY. The data must not be shared outside the authorized environment and must not be used for LLM training, fine-tuning, or unrelated purposes.**

Any operation that conflicts with this policy must be rejected unless explicit authorization is provided by the appropriate data owner/security authority.