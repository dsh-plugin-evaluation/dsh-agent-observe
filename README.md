# dsh-agent-observe

DSH 插件观测与安全评测工具。

## 安装

在 DSH 环境中执行：

```bash
dsh plugin --profile web add github:dsh-plugin-evaluation/dsh-agent-observe
```

安装后准备评测方案和安全测试数据：

```bash
pnpm --dir "${DSH_HOME:-$HOME/.dsh}/profiles/web" exec dsh-agent-observe-setup
```

数据会下载到：

```text
~/.dsh/evaluation/
├── dsh-plugin-evaluation-standards/
└── dsh-security-evaluation-dataset/
```

之后打开 DSH Web，在评测中心选择插件和评测方案即可。

## 数据来源

- `dsh-plugin-evaluation-standards`：评测规则、指标和方案目录。
- `dsh-security-evaluation-dataset`：实际安全测试用例。

当前数据集固定使用 `v1.0.0`。可以通过环境变量覆盖目录：

```bash
export DSH_EVALUATION_HOME="$HOME/.dsh/evaluation"
export DSH_STANDARDS_ROOT="$DSH_EVALUATION_HOME/dsh-plugin-evaluation-standards"
export DSH_DATASET_ROOT="$DSH_EVALUATION_HOME/dsh-security-evaluation-dataset"
```

## 开发

```bash
npm test
npm run setup-evaluation
```
