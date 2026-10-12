# @voila.dev/effect-bun-test

[Effect v4](https://effect.website) testing helpers for Bun's native
[`bun:test`](https://bun.sh/docs/cli/test) runner.

The API mirrors [`@effect/vitest`](https://www.npmjs.com/package/@effect/vitest)
(`it.effect`, `it.live`, `layer`, `it.prop`, `flakyTest`, …) so Effect test
suites move between the two runners without rewrites — while keeping Bun's test
runner speed and zero extra runner dependency.

> **Status**: a community package. Effect officially supports Vitest only, so
> the upstream proposal
> ([Effect-TS/effect#5964](https://github.com/Effect-TS/effect/issues/5964),
> [Effect-TS/effect#7521](https://github.com/Effect-TS/effect/pull/7521)) was
> closed in favour of maintaining it here. Each release follows the matching
> `@effect/vitest` release.

## Installation

```sh
bun add -d @voila.dev/effect-bun-test effect
```

## Usage

```ts
import { assert, describe, expect, it, layer } from "@voila.dev/effect-bun-test"
import { Context, Effect, Layer } from "effect"

// Effect tests run under TestClock + TestConsole
it.effect("swaps eventually", () =>
  Effect.gen(function*() {
    const value = yield* Effect.succeed(1)
    expect(value).toEqual(1)
  }))

// `it.live` runs against the live Clock instead
it.live("hits the real clock", () =>
  Effect.sleep("1 millis"))

// Share a Layer between tests (built once, released after the block)
class Foo extends Context.Service<Foo, "foo">()("Foo") {
  static layer = Layer.succeed(Foo)("foo")
}

layer(Foo.layer)("with foo", (it) => {
  it.effect("adds context", () =>
    Effect.gen(function*() {
      const foo = yield* Foo
      assert.strictEqual(foo, "foo")
    }))
})
```

Run with:

```sh
bun test
```

## Features

- `it.effect` — runs the test under `TestClock` + `TestConsole`, in a `Scope`
- `it.live` — same, against the live services
- `it.effect.skip / .only / .skipIf / .runIf / .fails / .each / .prop`
- `layer(myLayer)(...)` — share a memoized `Layer` across tests, with nested
  `it.layer` and automatic release; `excludeTestServices` supported, and
  `concurrent` runs a named block's tests concurrently (`describe.concurrent`)
- `it.prop` / `it.effect.prop` / `it.live.prop` — property testing via
  `effect/Arbitrary`, accepting `Schema` or `Arbitrary` inputs; pass
  `{ arbitrary: { runs, seed, … } }` as the options to tune the check
- `flakyTest` — retry an Effect test for up to a timeout
- `@voila.dev/effect-bun-test/utils` — the `@effect/vitest/utils` assertion
  helpers (`assertSome`, `assertSuccess`, `assertExitFailure`, …)
- `assert` — a chai-flavoured assertion object covering what Effect suites use
  from Vitest's re-exported `assert`

### Timeouts actually interrupt fibers

Bun's own test timeout fails the test but cannot stop the Effect running
behind it, so finalizers would never run. The wrapper owns the timeout
instead: when it fires, the test context's `AbortSignal` aborts, the fiber is
interrupted, and its finalizers run — Bun keeps a slightly larger timeout as a
backstop.

```ts
it.effect("cleans up on timeout", () =>
  Effect.acquireRelease(acquire, release), // release DOES run on timeout
  { timeout: 100 })
```

## Differences from `@effect/vitest`

- **`addEqualityTesters`** is a no-op — `bun:test`'s `expect` does not expose
  `addEqualityTesters`. Compare `Equal` values with `Equal.equals` or the
  `/utils` helpers.
- **`TestContext`** — Bun doesn't pass a context object to test functions, so
  the wrapper synthesises one (`signal`, `onTestFinished`, `onTestFailed`).

## Versioning

`<effect major>.<effect minor>.<build>`: `4.0.x` is built and tested against
`effect@4.0` and peers on `effect@^4.0.3`. The patch number counts builds, not
Effect patches.

The `0.112.x` line targeted `effect@4.0.0-rc.112`. Moving from it:
`it.prop` options take `arbitrary` (`Arbitrary.CheckOptions`) instead of
`fastCheck`, `FastCheck` arbitraries become `effect/Arbitrary` ones (or plain
`Schema`s), and `it.effect.each` tests receive `(case, ctx)` as in
`@effect/vitest`.

## License

MIT
