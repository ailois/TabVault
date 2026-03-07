# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-07 16:44:34
**Commit:** f267d98
**Branch:** main

## OVERVIEW
TabVault is currently a planning-stage repository for a local-first AI bookmark browser extension.
Implemented code is not present yet; the repo surface is product/docs + ignore policy only.

## STRUCTURE
```text
TabVault/
├── README.md     # product spec, stack direction, MVP roadmap
├── .gitignore    # generic JS/TS ignore template + two repo-specific ignores
└── LICENSE       # license metadata
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Understand product scope | `README.md` | Main source of truth today |
| Confirm architecture direction | `README.md` | Plasmo + TypeScript + React are planned, not implemented |
| Check local-only tooling rules | `.gitignore` | `.claude` and `AGENT.md` are intentionally ignored |
| Verify legal metadata | `LICENSE` | MIT |

## CODE MAP
No source tree yet. No entrypoints, exports, tests, or package manifests were found.

## CONVENTIONS
- Repo is documentation-first at this stage.
- Planned stack from `README.md`: Plasmo, TypeScript, React, IndexedDB, `chrome.storage`.
- Local contributor state stays untracked: `.claude/` is ignored.
- Singular `AGENT.md` is ignored; hierarchical `AGENTS.md` is not currently ignored.
- No enforced formatter, linter, type-check, test, or editor config exists yet.

## ANTI-PATTERNS (THIS PROJECT)
- Do not introduce a complex backend as the default architecture; `README.md` defines the project as local-first.
- Do not centralize user model account custody; users provide and manage their own API keys.
- Do not make remote storage the default for config, bookmarks, or AI results; local storage is the documented priority.

## UNIQUE STYLES
- Bilingual top-level product documentation (`README.md` mixes English + Chinese).
- Product intent is stronger than implementation detail right now; prefer documenting observed state over inventing folder guidance.

## COMMANDS
```bash
# None defined yet.
# No package.json, lockfile, Makefile, scripts/, or CI workflow files were found.
```

## NOTES
- Root is the only meaningful AGENTS scope today; no subdirectories have enough independent behavior to justify child files.
- Re-run `/init-deep` after real source directories, tests, or build tooling are added.
- If bootstrapping begins, first files to watch are `package.json`, `tsconfig.json`, Plasmo entry files, and test config.
