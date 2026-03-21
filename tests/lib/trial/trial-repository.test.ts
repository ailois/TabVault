import { beforeEach, describe, expect, it } from "vitest"

import { TrialRepository } from "../../../src/lib/trial/trial-repository"
import { TRIAL_STORAGE_KEY } from "../../../src/lib/trial/trial-constants"
import type { TrialState } from "../../../src/types/trial"

type StorageShape = Record<string, unknown>

describe("TrialRepository", () => {
  let storage: StorageShape
  let repository: TrialRepository

  beforeEach(() => {
    storage = {}

    globalThis.chrome = {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: storage[key] }),
          set: async (values: StorageShape) => {
            Object.assign(storage, values)
          }
        }
      }
    } as typeof chrome

    repository = new TrialRepository()
  })

  it("returns null when no trial state has been saved", async () => {
    await expect(repository.get()).resolves.toBeNull()
  })

  it("saves and retrieves trial state under the explicit storage key", async () => {
    const state: TrialState = {
      installedAt: "2026-03-19T00:00:00.000Z",
      analysisUsed: 0,
      licenseKey: "LSKEY-1234",
      licenseStatus: "valid",
      licenseValidatedAt: "2026-03-19T12:00:00.000Z"
    }

    await repository.save(state)

    expect(storage[TRIAL_STORAGE_KEY]).toEqual(state)
    await expect(repository.get()).resolves.toEqual(state)
  })

  it("increments analysisUsed by one", async () => {
    const state: TrialState = {
      installedAt: "2026-03-19T00:00:00.000Z",
      analysisUsed: 5
    }

    await repository.save(state)
    await repository.incrementAnalysisUsed()

    await expect(repository.get()).resolves.toEqual({
      ...state,
      analysisUsed: 6
    })
  })
})
