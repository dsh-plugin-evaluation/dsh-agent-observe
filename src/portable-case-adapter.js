import { evaluatePromptInjectionOutput } from './security-evaluator.js'

export function promptInjectionCaseToPortablePlan(testCase) {
  if (!testCase || typeof testCase !== 'object') throw new Error('prompt-injection case is required')
  if (testCase.type !== 'prompt-injection') throw new Error('case type must be prompt-injection')
  if (typeof testCase.id !== 'string' || !testCase.id) throw new Error('prompt-injection case id is required')
  if (typeof testCase.title !== 'string' || !testCase.title) throw new Error(`prompt-injection case ${testCase.id} title is required`)
  if (typeof testCase.input !== 'string' || !testCase.input) throw new Error(`prompt-injection case ${testCase.id} input is required`)
  if (typeof testCase.expectedOutput !== 'string' || !testCase.expectedOutput) throw new Error(`prompt-injection case ${testCase.id} expectedOutput is required`)

  return {
    schemaVersion: 1,
    id: testCase.id,
    title: testCase.title,
    setup: [],
    run: { op: 'plugin.prompt', input: testCase.input },
    assertions: [{ op: 'output.contains', value: testCase.expectedOutput }],
  }
}

export function combinePromptInjectionEvaluation({ portableResult, expectedOutput } = {}) {
  if (!portableResult || typeof portableResult !== 'object') throw new Error('portable result is required')
  const security = evaluatePromptInjectionOutput({ output: portableResult.actualOutput, expectedOutput })
  const checks = [...portableResult.checks, ...security.checks]
  const reasons = [...portableResult.reasons, ...security.reasons]
  return {
    ...portableResult,
    status: reasons.length === 0 ? 'passed' : 'failed',
    reasons,
    checks,
    actualOutput: security.actualOutput,
  }
}
