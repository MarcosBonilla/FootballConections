---
applyTo: '**'
description: 'Comprehensive secure coding standards based on OWASP Top 10 2025, with 55+ anti-patterns, detection regex, framework-specific fixes for modern web and backend frameworks, and AI/LLM security guidance.'
---

# Security Standards

Comprehensive security rules for web application development. Every anti-pattern includes a severity classification, detection method, OWASP 2025 reference, and corrective code examples.

**Severity levels:**
- **CRITICAL** — Exploitable vulnerability. Must be fixed before merge.
- **IMPORTANT** — Significant risk. Should be fixed in the same sprint.
- **SUGGESTION** — Defense-in-depth improvement. Plan for a future iteration.

---

## OWASP Top 10 — 2025 Quick Reference

| # | Category | Key Mitigation |
|---|----------|----------------|
| A01 | Broken Access Control | Auth middleware on every endpoint, RBAC, ownership checks |
| A02 | Security Misconfiguration | Security headers, no debug in prod, no default credentials |
| A03 | Software Supply Chain Failures | `npm audit`, lockfile integrity, SBOM |
| A04 | Cryptographic Failures | Argon2id/bcrypt for passwords, TLS everywhere, no secrets in code |
| A05 | Injection | Parameterized queries, input validation, no raw HTML with user input |
| A06 | Insecure Design | Threat modeling, secure design patterns, abuse case testing |
| A07 | Authentication Failures | Rate-limit login, secure session management, MFA |
| A08 | Software or Data Integrity Failures | SRI for CDN scripts, signed artifacts |
| A09 | Security Logging and Alerting Failures | Log security events, no PII in logs |
| A10 | Mishandling of Exceptional Conditions | Handle all errors, no stack traces in prod, fail-secure |

---

## Injection Anti-Patterns (I1-I8)

### I1: SQL Injection via String Concatenation
- **Severity**: CRITICAL | **OWASP**: A05

```typescript
// BAD
const result = await db.query(`SELECT * FROM users WHERE id = ${userId}`);

// GOOD — parameterized query
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### I2: NoSQL Injection
- **Severity**: CRITICAL | **OWASP**: A05

Validate and cast input types before passing to queries.

### I3: Command Injection
- **Severity**: CRITICAL | **OWASP**: A05

Prefer `execFile` over `exec`. Always pass arguments as arrays, never via shell interpolation. Set `timeout` and `maxBuffer`.

### I4: XSS via Unsanitized HTML
- **Severity**: CRITICAL | **OWASP**: A05

```typescript
// GOOD — sanitize with DOMPurify
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userContent);
```

Avoid `dangerouslySetInnerHTML`, `innerHTML`, `v-html` with user content.

### I5: SSRF via User-Controlled URLs
- **Severity**: CRITICAL | **OWASP**: A01

Allowlist schemes + hostnames + DNS validation. Resolve IPs and block private ranges.

### I6: Path Traversal
- **Severity**: CRITICAL | **OWASP**: A01

```typescript
const filePath = path.resolve(basePath, req.params.filename);
if (!filePath.startsWith(basePath + path.sep)) throw new Error('Path traversal detected');
```

### I7: Template Injection
- **Severity**: CRITICAL | **OWASP**: A05

Use predefined templates; user input only as data, never as template source.

### I8: XXE Injection
- **Severity**: CRITICAL | **OWASP**: A05

Disable external entities in XML parsers (`processEntities: false`).

---

## Authentication Anti-Patterns (AU1-AU8)

### AU1: JWT Algorithm Confusion (alg:none)
- **Severity**: CRITICAL | **OWASP**: A07

```typescript
// GOOD — enforce specific algorithm
const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### AU2: JWT Without Expiration
- **Severity**: CRITICAL | **OWASP**: A07

```typescript
const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '15m' });
```

### AU3: JWT in localStorage
- **Severity**: IMPORTANT | **OWASP**: A07

Store tokens in `httpOnly` cookies, not `localStorage`.

### AU4: Weak Password Hashing
- **Severity**: CRITICAL | **OWASP**: A04

Use Argon2id (not MD5/SHA1/SHA256 for passwords).

### AU5: Missing Brute-Force Protection
- **Severity**: CRITICAL | **OWASP**: A07

Rate-limit login, registration, and password reset endpoints.

### AU6: Session Fixation
- **Severity**: IMPORTANT | **OWASP**: A07

Regenerate session ID on successful login.

### AU7: OAuth Without State Parameter
- **Severity**: CRITICAL | **OWASP**: A07

Always include a cryptographically random `state` parameter to prevent CSRF.

### AU8: Missing PKCE
- **Severity**: IMPORTANT | **OWASP**: A07

Use PKCE with S256 challenge for all public OAuth clients (SPAs, mobile).

---

## Authorization Anti-Patterns (AZ1-AZ6)

### AZ1: Missing Auth Middleware on New Endpoints
- **Severity**: CRITICAL | **OWASP**: A01

```typescript
router.delete('/api/users/:id', authenticate, authorize('admin'), deleteUser);
```

### AZ2: Client-Side Only Authorization
- **Severity**: CRITICAL | **OWASP**: A01

Frontend guards are UX only. ALWAYS verify on server.

### AZ3: IDOR (Insecure Direct Object Reference)
- **Severity**: CRITICAL | **OWASP**: A01

Always verify ownership: `if (!order || order.userId !== req.user.id)`

### AZ4: Mass Assignment
- **Severity**: CRITICAL | **OWASP**: A01

Never pass `req.body` directly to DB updates. Explicitly pick allowed fields.

### AZ5: Privilege Escalation via Role Parameter
- **Severity**: CRITICAL | **OWASP**: A01

Ignore `role`/`isAdmin` from client input. Always set server-side.

### AZ6: Missing Re-Authentication for Sensitive Operations
- **Severity**: IMPORTANT | **OWASP**: A01

Require current password before account deletion, email change, etc.

---

## Secrets Anti-Patterns (S1-S6)

### S1: Hardcoded API Keys
- **Severity**: CRITICAL | **OWASP**: A04

Use `process.env.API_KEY`, never hardcode.

### S2: .env Committed to Git
- **Severity**: CRITICAL | **OWASP**: A04

Always add `.env`, `.env.local`, `*.pem`, `*.key` to `.gitignore`.

### S3: Server Secrets Exposed to Client
- **Severity**: CRITICAL | **OWASP**: A02

```bash
# BAD
NEXT_PUBLIC_DATABASE_URL=postgresql://...

# GOOD
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://api.example.com
```

### S4: Default Credentials in Config
- **Severity**: CRITICAL | **OWASP**: A02

Use environment variables with Zod schema validation at startup.

### S5: Secrets in CI/CD Logs
- **Severity**: IMPORTANT | **OWASP**: A09

Use masked secrets in CI. Never echo environment variables containing secrets.

### S6: Sensitive Data in Error Responses
- **Severity**: IMPORTANT | **OWASP**: A10

Only expose error details in development. Return generic errors in production.

---

## Headers Anti-Patterns (H1-H8)

### H1-H8 Summary
- **H1**: Missing `Content-Security-Policy` — IMPORTANT
- **H2**: CSP with `unsafe-inline`/`unsafe-eval` — use nonce-based CSP
- **H3**: Missing `Strict-Transport-Security` — `max-age=31536000; includeSubDomains; preload`
- **H4**: Missing `X-Content-Type-Options: nosniff`
- **H5**: Missing `X-Frame-Options: DENY`
- **H6**: Permissive `Referrer-Policy` — use `strict-origin-when-cross-origin`
- **H7**: Missing `Permissions-Policy`
- **H8**: CORS Wildcard with Credentials — CRITICAL

```typescript
// GOOD CORS
app.use(cors({
  origin: ['https://app.example.com'],
  credentials: true,
}));
```

---

## Frontend Anti-Patterns (FE1-FE8)

- **FE1**: Unsanitized HTML rendering — use DOMPurify
- **FE2**: `eval()` with user input — use `JSON.parse` instead
- **FE3**: `postMessage` without origin validation — always check `event.origin`
- **FE4**: Prototype pollution — validate keys before merging user objects
- **FE5**: Open redirect — allow relative paths only
- **FE6**: Sensitive data in `localStorage` — use `httpOnly` cookies
- **FE7**: Missing CSRF token — use double-submit cookie or synchronizer token
- **FE8**: Client-only input validation — ALWAYS validate on server too

---

## Framework-Specific: React / Next.js (RX1-RX4)

### RX1: Server Action Without Auth
- **Severity**: CRITICAL | **OWASP**: A01

```typescript
'use server';
import { auth } from '@/auth';
export async function deleteUser(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') throw new Error('Unauthorized');
  await db.user.delete({ where: { id } });
}
```

### RX2: `process.env` Without `NEXT_PUBLIC_` in Client
- **Severity**: IMPORTANT | **OWASP**: A02

### RX3: RSC Serialization Leaking Data
- **Severity**: IMPORTANT | **OWASP**: A01

Pick only needed fields before passing DB objects to Client Components.

### RX4: `middleware.ts` Not Protecting API Routes
- **Severity**: IMPORTANT | **OWASP**: A01

Ensure `config.matcher` covers `/api/`.

---

## Dependencies Anti-Patterns (D1-D5)

- **D1**: Known vulnerable dependency — run `npm audit` in CI
- **D2**: Lockfile out of sync — use `npm ci`
- **D3**: Typosquatting risk — review new dependency names
- **D4**: Postinstall scripts in new dependency — review `package.json`
- **D5**: Unpinned versions in production — avoid `*` or `latest`

---

## Logging Anti-Patterns (L1-L4)

- **L1**: Security events not logged — log auth failures, access denied, rate limit hits
- **L2**: Sensitive data in logs — use `pino` with `redact` config
- **L3**: Missing trace IDs — add correlation IDs to all log records
- **L4**: Log injection — use structured JSON logging, not string concatenation

---

## AI/LLM Security Anti-Patterns (AI1-AI3)

### AI1: Prompt Injection
- **Severity**: CRITICAL | **OWASP**: A05

Use structured system/user message separation. Never concatenate user input directly into prompts.

### AI2: LLM Output in SQL/Shell
- **Severity**: CRITICAL | **OWASP**: A05

Treat LLM output as untrusted user input. Always parameterize and validate.

### AI3: Missing Output Validation
- **Severity**: IMPORTANT | **OWASP**: A08

Validate LLM output against Zod/JSON Schema before use.

---

## Security Checklist

### Authentication and Sessions
- [ ] Passwords hashed with Argon2id or bcrypt (cost >= 12)
- [ ] JWT signed with RS256/ES256, algorithm enforced on verify
- [ ] Access tokens expire in <= 15 minutes
- [ ] Refresh tokens: one-time use, rotated, stored in httpOnly cookie
- [ ] Rate limiting on login, registration, and password reset
- [ ] Session regenerated after authentication

### Authorization
- [ ] Every API endpoint has auth middleware
- [ ] Ownership checks on all resource access (prevent IDOR)
- [ ] Server-side authorization (frontend guards are UX only)
- [ ] Mass assignment prevented (explicit field selection)

### Input and Output
- [ ] All user input validated server-side (zod/joi)
- [ ] Parameterized queries for all database operations
- [ ] HTML output sanitized (DOMPurify) when rendering user content
- [ ] Error responses do not expose stack traces in production

### Secrets
- [ ] No hardcoded secrets in source code
- [ ] `.env` files in `.gitignore`
- [ ] Server secrets not exposed to client
- [ ] Environment variables validated at startup

### Headers
- [ ] CSP configured (nonce-based preferred)
- [ ] HSTS with preload
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] CORS restricted to known origins

### Dependencies
- [ ] `npm audit` passing in CI
- [ ] Lockfile committed and verified with `npm ci`
- [ ] No wildcard or "latest" versions in production

### Logging
- [ ] Security events logged
- [ ] No sensitive data in logs
- [ ] Structured logging with correlation IDs
