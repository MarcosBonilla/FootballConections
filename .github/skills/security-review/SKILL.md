---
name: security-review
description: 'AI-powered codebase security scanner that reasons about code like a security researcher — tracing data flows, understanding component interactions, and catching vulnerabilities that pattern-matching tools miss. Use this skill when asked to scan code for security vulnerabilities, find bugs, check for SQL injection, XSS, command injection, exposed API keys, hardcoded secrets, insecure dependencies, access control issues, or any request like "is my code secure?", "review for security issues", "audit this codebase", or "check for vulnerabilities". Covers injection flaws, authentication and access control bugs, secrets exposure, weak cryptography, insecure dependencies, and business logic issues across JavaScript, TypeScript, Python, Java, PHP, Go, Ruby, and Rust.'
---

# Security Review

An AI-powered security scanner that reasons about your codebase the way a human security researcher would — tracing data flows, understanding component interactions, and catching vulnerabilities that pattern-matching tools miss.

## When to Use This Skill

Use this skill when the request involves:

- Scanning a codebase or file for security vulnerabilities
- Running a security review or vulnerability check
- Checking for SQL injection, XSS, command injection, or other injection flaws
- Finding exposed API keys, hardcoded secrets, or credentials in code
- Auditing dependencies for known CVEs
- Reviewing authentication, authorization, or access control logic
- Detecting insecure cryptography or weak randomness
- Performing a data flow analysis to trace user input to dangerous sinks
- Any request like "is my code secure?", "scan this file", or "check my repo for vulnerabilities"

## How This Skill Works

Unlike traditional static analysis tools that match patterns, this skill:
1. **Reads code like a security researcher** — understanding context, intent, and data flow
2. **Traces across files** — following how user input moves through your application
3. **Self-verifies findings** — re-examines each result to filter false positives
4. **Assigns severity ratings** — CRITICAL / HIGH / MEDIUM / LOW / INFO
5. **Proposes targeted patches** — every finding includes a concrete fix
6. **Requires human approval** — nothing is auto-applied; you always review first

## Execution Workflow

### Step 1 — Scope Resolution
- If a path was provided, scan only that scope
- If no path given, scan the entire project starting from the root
- Identify the language(s) and framework(s) in use

### Step 2 — Dependency Audit
- **Node.js**: Check `package.json` + `package-lock.json` for known vulnerable packages
- Flag packages with known CVEs, deprecated crypto libs, or suspiciously old pinned versions

### Step 3 — Secrets & Exposure Scan
Scan ALL files (including config, env, CI/CD, Dockerfiles) for:
- Hardcoded API keys, tokens, passwords, private keys
- `.env` files accidentally committed
- Secrets in comments or debug logs
- Cloud credentials (AWS, GCP, Azure, Stripe, Twilio, etc.)
- Database connection strings with credentials embedded

### Step 4 — Vulnerability Deep Scan

**Injection Flaws**
- SQL Injection: raw queries with string interpolation, ORM misuse, second-order SQLi
- XSS: unescaped output, `dangerouslySetInnerHTML`, `innerHTML`, template injection
- Command Injection: exec/spawn/system with user input
- SSRF, Path Traversal, XXE

**Authentication & Access Control**
- Missing authentication on sensitive endpoints
- Broken object-level authorization (BOLA/IDOR)
- JWT weaknesses (alg:none, weak secrets, no expiry validation)
- Session fixation, missing CSRF protection
- Privilege escalation paths
- Mass assignment / parameter pollution

**Data Handling**
- Sensitive data in logs, error messages, or API responses
- Missing encryption at rest or in transit
- Insecure deserialization

**Cryptography**
- Use of MD5, SHA1, DES for security purposes
- Hardcoded IVs or salts
- Weak random number generation (`Math.random()` for tokens)

**Business Logic**
- Race conditions (TOCTOU)
- Missing rate limiting on sensitive endpoints
- Predictable resource identifiers

### Step 5 — Cross-File Data Flow Analysis
- Trace user-controlled input from entry points (HTTP params, headers, body, file uploads)
- All the way to sinks (DB queries, exec calls, HTML output, file writes)
- Identify vulnerabilities that only appear across multiple files

### Step 6 — Self-Verification Pass
For EACH finding:
1. Re-read the relevant code with fresh eyes
2. Ask: "Is this actually exploitable, or is there sanitization I missed?"
3. Check if a framework or middleware already handles this upstream
4. Downgrade or discard findings that aren't genuine vulnerabilities

### Step 7 — Generate Security Report

Output format:
```
## Security Review Report

### Summary
| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | X |
| 🟠 HIGH | X |
| 🟡 MEDIUM | X |
| 🔵 LOW | X |
| ⚪ INFO | X |

### Findings by Category

#### [Category Name]

**[SEVERITY] Finding Title**
- File: `path/to/file.ts` line XX
- Vulnerable code: `...`
- Risk: What could an attacker do?
- Confidence: High / Medium / Low
- Fix: ...
```

### Step 8 — Propose Patches
For every CRITICAL and HIGH finding:
- Show the vulnerable code (before)
- Show the fixed code (after)
- Explain what changed and why
- Preserve original code style

**"Review each patch before applying. Nothing has been changed yet."**

## Severity Guide

| Severity | Meaning | Example |
|----------|---------|---------|
| 🔴 CRITICAL | Immediate exploitation risk | SQLi, RCE, auth bypass |
| 🟠 HIGH | Serious vulnerability, exploit path exists | XSS, IDOR, hardcoded secrets |
| 🟡 MEDIUM | Exploitable with conditions | CSRF, open redirect, weak crypto |
| 🔵 LOW | Best practice violation | Verbose errors, missing headers |
| ⚪ INFO | Observation worth noting | Outdated dependency (no CVE) |

## Output Rules

- **Always** produce a findings summary table first (counts by severity)
- **Never** auto-apply any patch — present patches for human review only
- **Always** include a confidence rating per finding (High / Medium / Low)
- **Group findings** by category, not by file
- **Be specific** — include file path, line number, and the exact vulnerable code snippet
- **Explain the risk** in plain English — what could an attacker do with this?
- If the codebase is clean, say so clearly: "No vulnerabilities found" with what was scanned
