export type TestFn = () => void | Promise<void>

type RegisteredTest = {
  suite: string
  name: string
  fn: TestFn
}

const tests: RegisteredTest[] = []
let currentSuite = 'default'

export function suite(name: string, register: () => void): void {
  const previous = currentSuite
  currentSuite = name
  try {
    register()
  } finally {
    currentSuite = previous
  }
}

export function test(name: string, fn: TestFn): void {
  tests.push({ suite: currentSuite, name, fn })
}

export async function runAllTests(): Promise<{ passed: number; failed: number }> {
  let passed = 0
  let failed = 0

  for (const item of tests) {
    try {
      await item.fn()
      passed += 1
      process.stdout.write(`PASS ${item.suite} :: ${item.name}\n`)
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.stack || error.message : String(error)
      process.stdout.write(`FAIL ${item.suite} :: ${item.name}\n${message}\n`)
    }
  }

  return { passed, failed }
}
