import { createServer } from 'node:net'

const DEFAULT_STARTUP_TIMEOUT_MS = 60_000

export function resolveStartupTimeout(value) {
  if (value === undefined) return DEFAULT_STARTUP_TIMEOUT_MS
  const timeout = Number(value)
  if (!Number.isInteger(timeout) || timeout < 1) throw new Error('DSH_E2E_STARTUP_TIMEOUT_MS must be a positive integer')
  return timeout
}

function canListen(port) {
  return new Promise((resolvePromise, reject) => {
    const server = createServer()
    server.once('error', error => {
      if (error.code === 'EADDRINUSE') resolvePromise(false)
      else reject(error)
    })
    server.listen(port, '127.0.0.1', () => server.close(() => resolvePromise(true)))
  })
}

function availablePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address !== 'object') {
        server.close(() => reject(new Error('failed to allocate an E2E port')))
        return
      }
      server.close(() => resolvePromise(address.port))
    })
  })
}

export async function reserveE2ePort(requestedPort) {
  if (await canListen(requestedPort)) return requestedPort
  return availablePort()
}
