# Threat Model: Password Recovery Flow (P2-WP-007A)

This document contains the threat model for the anonymous password recovery flow centered on `resetPasswordWithVerification` in `backend/main.mo`.

## Trust Boundaries
- **Client-Canister Boundary**: The boundary between the React/TypeScript frontend (untrusted client environment) and the Motoko canister on the Internet Computer Protocol (trusted canister execution environment).
- **Anonymous Session Boundary**: Callers invoking canister endpoints without an active authenticated identity session.

## System Assets
- **Canister State (`users` Map)**: Stores user credentials (passwords, user roles, principal IDs, metadata).
- **Master Admin Account**: The unique `#Admin` account (`username: admin`) with full administrative control.
- **Canister Ledger and Historical Records**: Access to financial transactions, job work collections, and operational logs.

## Attackers & Threat Profiles
- **External Attacker (Anonymous)**: Any internet caller seeking to hijack the system.
- **Malicious Insider**: Staff or Manager seeking to elevate privileges or hijack the Master Admin account.

## Threat Analysis & Findings

### SEC-FIND-001: Anonymous Account Hijacking of Privileged Accounts
* **Severity**: Critical
* **Description**: The endpoint `resetPasswordWithVerification` accepts requests from anonymous callers to reset the password and principal ID of *any* user account if they know the username, email, and mobile number.
* **Risk**: If an attacker acquires these public/semi-private details (e.g. via social engineering, phishing, or log inspection), they can re-associate the Master Admin or Admin accounts to their own derived cryptographic identity. This results in complete system compromise and administrative lockout.

### SEC-FIND-002: Lack of Rate Limiting / Brute-Force Exposure
* **Severity**: High
* **Description**: There is no canister-level rate limiting, IP-level throttling, or verification attempt counters.
* **Risk**: Attackers can run automated brute-force attacks against target usernames to guess the registered email and mobile numbers, bypassing the client-side validation checks and resetting the password once matched.

### SEC-FIND-003: Recovery Fields Information Leakage
* **Severity**: Medium
* **Description**: User profile data (including email and mobile numbers) is referenced during the check.
* **Risk**: Since the company details and employee contacts might be listed on shared portals or internal documentation, these fields do not offer high-entropy authentication.

### SEC-FIND-004: Audit Log Spoofing and Integrity Gaps
* **Severity**: High
* **Description**: The system logs the password recovery completion using the *new* principal supplied by the caller.
* **Risk**: The audit log records the attacker's newly bound principal as the operator, but doesn't retain the original principal or capture verification telemetry of the request, obscuring the attack path.

### SEC-FIND-005: Replay and Re-association Vulnerability
* **Severity**: Medium
* **Description**: The recovery flow requires sending `newPrincipalId` and `newPasswordHash` directly from the client.
* **Risk**: Lack of a cryptographic nonce, request expiration, or server-side challenge means an attacker capturing the request signature can replay it or modify parameters.

### SEC-FIND-006: Denial of Service / Account Lockout
* **Severity**: High
* **Description**: An attacker can repeatedly reset staff or admin passwords to invalid principal IDs.
* **Risk**: This results in persistent denial of service and user lockout, halting business operations.
