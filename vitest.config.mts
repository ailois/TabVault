import { defineConfig, defaultExclude } from "vitest/config"

export default defineConfig({
  test: {
    // Prevent Vitest from discovering tests inside local git worktrees.
    // This avoids duplicate test execution and noisy Windows worker teardown warnings.
    exclude: [...defaultExclude, ".worktrees/**", "**/.worktrees/**"],
    // On Windows, the default "forks" pool can emit "kill EPERM" warnings during teardown.
    pool: "threads"
  }
})

