import { Effect, Layer } from "effect"
import { assert, describe, it, layer } from "../src/index.ts"
import type { BunTest } from "../src/index.ts"

const checkConcurrency = (it: BunTest.MethodsNonLive, concurrent: boolean) => {
  let running = 0
  let release!: () => void
  const bothStarted = new Promise<void>((resolve) => {
    release = resolve
  })

  for (const name of ["first", "second"]) {
    it.effect(name, () =>
      Effect.gen(function*() {
        running++
        if (running === 2) release()
        try {
          if (concurrent) {
            yield* Effect.promise(() => bothStarted)
          } else {
            // Let another test start if the suite was accidentally made concurrent.
            yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
            assert.strictEqual(running, 1)
          }
        } finally {
          running--
        }
      }), { timeout: 1_000 })
  }
}

for (const [name, makeLayer] of [["layer", layer], ["it.layer", it.layer]] as const) {
  describe(name, () => {
    makeLayer(Layer.empty)("runs serially by default", (it) => {
      checkConcurrency(it, false)
    })

    makeLayer(Layer.empty, { concurrent: true })("concurrent: true", (it) => {
      checkConcurrency(it, true)

      it.layer(Layer.empty)("nested layer inherits", (it) => {
        checkConcurrency(it, true)
      })

      it.layer(Layer.empty, { concurrent: false })("nested layer overrides parent", (it) => {
        checkConcurrency(it, false)
      })
    })
  })
}
