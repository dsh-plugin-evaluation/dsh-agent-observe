# dsh-agent-observe

DSH 插件观测与安全评测工具。

## 安装

```bash
dsh plugin --profile web add github:dsh-plugin-evaluation/dsh-agent-observe
```

安装插件时不会下载评测数据。

## 使用评测

1. 打开 DSH Web 的“评测中心”。
2. 打开“选择评测方案”。此时按需获取 `dsh-plugin-evaluation-standards`。
3. 选择评测方案并创建实验。此时才按 `catalog.json` 中的固定版本获取对应安全评测集。
4. 执行实验。

数据默认缓存到：

```text
~/.dsh/evaluation/
```

数据来源：

- `dsh-plugin-evaluation-standards`：评测规则、指标和方案目录。
- `dsh-security-evaluation-dataset`：实际安全测试用例。

当前安全评测集固定使用 `v1.0.0`。可以通过环境变量覆盖目录：

```bash
export DSH_EVALUATION_HOME="$HOME/.dsh/evaluation"
export DSH_STANDARDS_ROOT="$DSH_EVALUATION_HOME/dsh-plugin-evaluation-standards"
export DSH_DATASET_ROOT="$DSH_EVALUATION_HOME/dsh-security-evaluation-dataset"
```

## 测试

普通单元测试：

```bash
npm test
```

真实 DSH E2E 测试需要一个已构建的 DSH 源码目录、隔离的 DSH_HOME、standards 目录和 dataset 目录：

```bash
DSH_E2E_DSH_ROOT=/path/to/deepseek-harness \
DSH_E2E_DSH_HOME=/tmp/dsh-e2e-home \
DSH_STANDARDS_ROOT=/path/to/dsh-plugin-evaluation-standards \
DSH_DATASET_ROOT=/path/to/dsh-security-evaluation-dataset \
npm run test:e2e
```

E2E 默认覆盖：

- DSH Web 是否能启动；
- 插件是否能被真实 Web Profile 发现；
- 评测方案目录是否可读取；
- 选择方案时是否按需加载外部数据集；
- 无效方案是否返回错误；
- 可选的真实插件运行和评测报告结构。

如需执行真实模型评测，再加：

```bash
DSH_E2E_RUN_VALIDATION=1
```
