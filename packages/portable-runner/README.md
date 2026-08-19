# @dsh-plugin-evaluation/portable-runner

Host-independent execution engine for DSH Portable Case Plans.

The package creates a temporary workspace per case, supports the bounded setup and output assertion operations from the standards repository, and removes the workspace after execution. The host supplies `runPlugin({ input, cwd, env })`.

```js
import { runPortableCasePlan } from '@dsh-plugin-evaluation/portable-runner'

const result = await runPortableCasePlan({
  plan,
  async runPlugin({ input, cwd, env }) {
    return { output: await runYourPlugin(input, { cwd, env }), exitCode: 0 }
  },
})
```

This package does not depend on DSH and does not decide how a plugin process is started. DSH-specific process setup remains in `dsh-agent-observe`.
