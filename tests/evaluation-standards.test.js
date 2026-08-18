import test from 'node:test'
import assert from 'node:assert/strict'
import { listEvaluationProfiles, loadEvaluationProfiles } from '../src/evaluation-standards.js'

const root = '/standards'
const files = new Map([
  [`${root}/catalog.json`, JSON.stringify({
    schemaVersion: 1,
    profiles: [
      { id: 'alpha-v1', path: 'profiles/alpha-v1.json', version: '1.0.0' },
      { id: 'beta-v1', path: 'profiles/beta-v1.json', version: '1.0.0' },
    ],
  })],
  [`${root}/profiles/alpha-v1.json`, JSON.stringify({
    id: 'alpha-v1', name: 'Alpha', version: '1.0.0', description: 'Alpha profile', metrics: ['duration'], casesPath: 'cases/alpha-v1.json',
  })],
  [`${root}/profiles/beta-v1.json`, JSON.stringify({
    id: 'beta-v1', name: 'Beta', version: '1.0.0', description: 'Beta profile', metrics: ['answer-matches-expected'], casesPath: 'cases/beta-v1.json',
  })],
  [`${root}/cases/alpha-v1.json`, JSON.stringify({
    schemaVersion: 1, profileId: 'alpha-v1', version: '1.0.0', cases: [{ id: 'shared-case', title: 'Alpha case', prompt: 'alpha', expected: 'A' }],
  })],
  [`${root}/cases/beta-v1.json`, JSON.stringify({
    schemaVersion: 1, profileId: 'beta-v1', version: '1.0.0', cases: [{ id: 'shared-case', title: 'Beta case', prompt: 'beta', expected: 'B' }],
  })],
])

const read = async path => files.get(path)

test('lists profiles with their metadata and case counts', async () => {
  const profiles = await listEvaluationProfiles({ root, read })
  assert.deepEqual(profiles, [
    { id: 'alpha-v1', name: 'Alpha', version: '1.0.0', description: 'Alpha profile', metrics: ['duration'], caseCount: 1, standardVersion: '1.0.0' },
    { id: 'beta-v1', name: 'Beta', version: '1.0.0', description: 'Beta profile', metrics: ['answer-matches-expected'], caseCount: 1, standardVersion: '1.0.0' },
  ])
})

test('loads selected profiles in user order without deduplicating cases', async () => {
  const profiles = await loadEvaluationProfiles(['beta-v1', 'alpha-v1'], { root, read })
  assert.deepEqual(profiles.map(profile => profile.id), ['beta-v1', 'alpha-v1'])
  assert.deepEqual(profiles.flatMap(profile => profile.cases).map(item => [item.profileId, item.id]), [
    ['beta-v1', 'shared-case'],
    ['alpha-v1', 'shared-case'],
  ])
})

test('rejects empty or unknown profile selections', async () => {
  await assert.rejects(() => loadEvaluationProfiles([], { root, read }), /至少选择一个评测方案/)
  await assert.rejects(() => loadEvaluationProfiles(['missing'], { root, read }), /未找到评测方案：missing/)
})
