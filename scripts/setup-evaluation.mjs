#!/usr/bin/env node

import { access, mkdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

export const EVALUATION_HOME = process.env.DSH_EVALUATION_HOME ?? resolve(process.env.DSH_HOME ?? homedir(), 'evaluation')
export const SOURCES = [
  {
    name: 'dsh-plugin-evaluation-standards',
    repository: 'https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards.git',
    ref: 'main',
  },
  {
    name: 'dsh-security-evaluation-dataset',
    repository: 'https://github.com/dsh-plugin-evaluation/dsh-security-evaluation-dataset.git',
    ref: 'v1.0.0',
  },
]

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' })
    child.once('error', reject)
    child.once('close', code => code === 0 ? resolvePromise() : reject(new Error(`${command} 退出码：${code}`)))
  })
}

async function isDirectory(path) {
  try {
    await access(path, constants.R_OK)
    return true
  } catch {
    return false
  }
}

export async function setupEvaluation({ root = EVALUATION_HOME, sources = SOURCES, execute = run } = {}) {
  await mkdir(root, { recursive: true })
  for (const source of sources) {
    const target = resolve(root, source.name)
    if (await isDirectory(resolve(target, '.git'))) {
      await execute('git', ['-C', target, 'fetch', '--depth', '1', 'origin', source.ref])
      await execute('git', ['-C', target, 'checkout', '--force', source.ref])
    } else {
      await execute('git', ['clone', '--depth', '1', '--branch', source.ref, source.repository, target])
    }
  }
  return {
    root,
    standardsRoot: resolve(root, 'dsh-plugin-evaluation-standards'),
    datasetRoot: resolve(root, 'dsh-security-evaluation-dataset'),
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  setupEvaluation()
    .then(({ root }) => console.log(`评测方案和安全评测数据已准备到：${root}`))
    .catch(error => {
      console.error(`评测数据准备失败：${error.message}`)
      process.exitCode = 1
    })
}
