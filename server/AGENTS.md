# Munder-Difflin Project

**This project operates under Munder-Difflin — a portable AI software-engineering operating system. Agent 0 is Munder-Difflin’s control-plane identity and source of truth.**

> **Bootstrap file.** The canonical Munder-Difflin skills live in the installed
> framework, including `skills/impeccable/SKILL.md` and
> `skills/design-taste-frontend/SKILL.md`. This file is
> the project-level bootstrap created by `md-init` and exists to be discovered
> natively by clients (e.g. Claude Code) that read `AGENTS.md` at the project
> root.

## For AI Coding Assistants

If you are an AI coding assistant entering this project, you should:

1. **Identify Munder-Difflin**: This is a Munder-Difflin project. The framework
   manages persistent project state, workflow, safety rules, verification
   gates, task orchestration, handoff/continuity, and learning.

2. **Follow the canonical sources** (do NOT redefine them):
   - `PROJECT-CONSTITUTION.md` — project-specific principles
   - `core/AGENTS.md` — agent roles, state machine, model routing, safety
   - `.munder-difflin/state/` — current project state (do not bypass)
   - `md-*` CLI commands — for all framework operations
   - Munder-Difflin Agent 0 policy — the canonical routing, safety, skill,
     verification, and handoff authority

3. **Use framework commands** instead of duplicating framework logic:
   ```bash
   md-status       # Project status
   md-doctor       # Framework health
   md-task         # Implementation orchestrator
   md-handoff      # Cross-agent handoff
   md-capture      # Tool activity capture
   md-learn        # Learning records
   md-verify       # Verification checks
   md-browser-verify # Browser verification and console smoke test
   md-read         # Universal document extractor (PDF, DOCX, XLSX, text)
   md-guard        # Protected component check
   md-propose      # Stage change for approval
   md-approve      # Record user decision
   ```

4. **Respect safety rules**:
   - Check `state/protected-components.yaml` before modifications
   - Use `md-checkpoint` before risky operations
   - Follow `md-propose` → `md-approve` for protected components
   - Verify repository reality before trusting cached state

5. **Do not duplicate** any of the above — the framework is the source of truth.

## State Machine

Agents follow: `DISCOVERING → PLANNING → READY → WORKING → TESTING → REVIEWING → COMPLETE → HANDOFF`

Blocked: `BLOCKED`, `FAILED` (requires `md-unblock` to recover, never direct to WORKING)

## Framework Version

The canonical framework version is recorded in the installed package metadata.
The project-local `.munder-difflin/` directory stores project state only; it is
not a second copy of the framework skills.

---

> This is the project bootstrap. It is intentionally thin. The canonical
> instructions, state, and protocols live in the Munder-Difflin framework
> installation itself. For full documentation, see `MASTER-SPEC.md` and
> `ARCHITECTURE.md` in the framework source.
