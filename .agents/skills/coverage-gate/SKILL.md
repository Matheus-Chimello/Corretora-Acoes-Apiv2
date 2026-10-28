---
name: coverage-gate
description: Verify this project's line and branch coverage after TDD steps and before commits or pull requests, without weakening the existing quality gates.
---
# Coverage gate

Use the public HTTP routes, public domain services and rendered user flows already agreed in the task. For a new interface, agree its test boundary before changing behavior. Read AGENTS.md and docs/TESTES.md.

## Commands

- Select SPRING_PROFILES_ACTIVE=test; never use real credentials or production databases.
- Backend: ./mvnw verify (Windows: .\mvnw.cmd verify).
- Frontend, from src/main/front: npm run test:coverage.
- Protected configuration: python scripts/check_coverage_policy.py; in a PR add --base-ref origin/<target-branch>.
- Configuration regression tests: python -m unittest discover -s scripts/tests -v.
- Locked third-party skills: node scripts/verify_skills_lock.mjs.

## Rules

1. Overall line AND branch coverage must remain at least 80%. Changed lines in a PR must also reach 80% through diff-cover.
2. If coverage drops, return to a small TDD cycle at the agreed public boundary: one failing behavioral test, minimum implementation, then the green suite. Refactor with tests passing, as required by AGENTS.md.
3. Never lower thresholds, add coverage exclusions, weaken assertions, or skip/delete tests just to pass. Any justified exclusion requires explicit user approval and review of the protected configuration.
4. Compare thresholds and coverage scope with the target branch; a higher existing threshold must not regress to 80%.
5. Use doubles at external boundaries (HTTP, persistence, time). Exercise the project's own services and components through real implementations. Check observable results, errors and user isolation.
6. Report the actual line/branch percentages, commands and unresolved gaps at the end. A green unit suite alone does not prove that the coverage gate or CI passed.
