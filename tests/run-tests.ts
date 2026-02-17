import './parser.spec'
import './stream.spec'
import { runAllTests } from './test-harness'

async function main(): Promise<void> {
  const result = await runAllTests()
  const total = result.passed + result.failed
  process.stdout.write(`\nSummary: ${result.passed}/${total} passed, ${result.failed} failed\n`)

  if (result.failed > 0) {
    process.exitCode = 1
  }
}

void main()
