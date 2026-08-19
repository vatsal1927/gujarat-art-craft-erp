# MASTER IMPLEMENTATION PROMPT

## P2-WP-ENV-004 - Reserved Keyword Stable Migration

Project:
Gujarat Art & Craft ERP

Phase:
P2 Runtime Development

Work Package:
P2-WP-ENV-004

Status:
Implementation Guidance Pending Final Enterprise Review and Design Approval

---

This prompt is a guidance artifact for the implementation phase and becomes active only after Design Approval is completed and Final Enterprise Review returns PASS.

Before changing any code, confirm that Final Enterprise Review has passed and that Design Approval has been granted. Read and follow the design documents in the exact order listed below. Documentation is the source of truth.

Mandatory Documents - Required Reading Order

1. `infrastructure/validation/icp/docs/P2-WP-ENV-004-Stable-Migration-Architecture.md`
2. `docs/architecture/P2-WP-ENV-004-Dependency-Map.md`
3. `docs/architecture/P2-WP-ENV-004-Implementation-Plan.md`
4. `docs/architecture/P2-WP-ENV-004-Final-Design-Review.md`
5. `docs/architecture/P2-WP-ENV-004-Design-Amendments.md`
6. `docs/architecture/P2-WP-ENV-004-Stable-Compatibility-Design.md`
7. `docs/architecture/P2-WP-ENV-004-Candid-Compatibility-Design.md`
8. `docs/architecture/P2-WP-ENV-004-Backup-Compatibility-Design.md`
9. `docs/architecture/P2-WP-ENV-004-Implementation-Checklist.md`
10. `docs/architecture/P2-WP-ENV-004-Design-Approval.md`

Implementation must not begin until Final Enterprise Review has passed and Design Approval has been granted.

Then begin implementation.

---

Primary Goal

Resolve Motoko reserved keyword conflicts without changing business behaviour.

---

Implementation Rules

Non-negotiable constraints:

- Documentation is the source of truth.
- No business logic changes.
- No calculation changes.
- No unrelated refactoring.
- Preserve data integrity.
- Preserve upgrade safety.
- Preserve rollback safety.
- Preserve Candid compatibility.
- Preserve backup compatibility.

DO NOT

- Change business logic
- Change calculations
- Perform unrelated refactoring
- Change GST logic
- Change Production logic
- Change Inventory logic
- Change Collections logic
- Change Sales logic
- Change Finance logic
- Change Authentication
- Change Authorization
- Change Permissions
- Change Dashboard
- Change Reports
- Change UI behaviour
- Change API behaviour unless required by migration
- Remove existing compatibility
- Remove backup compatibility
- Remove import compatibility
- Remove export compatibility

---

Allowed Changes

Only changes directly required for reserved keyword migration.

Examples:

- UnitConfig schema
- Stable migration
- Compatibility layer
- Translation layer
- Generated declarations
- Required frontend mappings

Nothing else.

---

Migration Requirements

Migration must guarantee:

- Zero data loss
- Preserve data integrity
- Preserve upgrade safety
- Preserve rollback safety
- Preserve Candid compatibility
- Preserve backup compatibility
- Stable upgrade compatibility
- Rollback capability
- Existing backup compatibility
- Existing import compatibility
- Existing export compatibility
- Existing frontend compatibility

---

Implementation Order

Complete each phase in sequence. Never skip a phase or merge phases together.

Step 1

Update internal schema.

Compile.

Fix compile errors.

Stop.

Step 2

Update migration.

Compile.

Stop.

Step 3

Generate declarations.

Compile.

Stop.

Step 4

Update frontend compatibility.

Compile.

Stop.

Step 5

Run migration tests.

Step 6

Run import/export tests.

Step 7

Run Docker validation.

Step 8

Run ICP validation.

---

After Every Implementation Phase

Complete the following gate in this exact order:

Compile

↓

Validation

↓

Implementation Report

↓

Human Approval

↓

Continue

The implementation report must include:

- Files modified
- Reason
- Compile status
- Validation status
- Errors
- Next planned step

Stop after every phase. Wait for explicit human approval before continuing to the next phase. Never continue automatically, never skip phases, and never merge phases together.

---

Validation

Every phase must finish with:

- No compile errors
- No type errors
- No migration errors
- No data loss
- No regression

---

Rollback

If any validation fails:

Stop immediately.

Do not continue.

Do not partially migrate.

Provide failure report.

---

Output Format

For every implementation phase provide:

Summary

Files Modified

Reason

Compile Result

Migration Result

Validation Result

Remaining Work

---

Success Criteria

Implementation is complete only if:

- Backend compiles
- Frontend compiles
- Migration succeeds
- Stable upgrade succeeds
- Backup import succeeds
- Backup export succeeds
- Existing data preserved
- No business logic changed
- No runtime regressions
