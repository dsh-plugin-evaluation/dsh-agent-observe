#!/bin/bash
# 在 Docker 中启动 DSH 并运行真实 E2E 测试。
# 用法：bash scripts/docker-e2e.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${DSH_WEB_PORT:-4380}"
BASE_URL="http://127.0.0.1:${PORT}"

echo "==> 构建并启动 DSH 容器"
docker compose up -d --build

echo "==> 等待评测接口就绪"
for i in $(seq 1 90); do
  if curl -fsS "${BASE_URL}/api/agent-observe/evaluation-profiles" 2>/dev/null | grep -q '"profiles"'; then
    echo "==> DSH 已就绪：${BASE_URL}"
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo "==> 等待超时，容器日志："
    docker compose logs --tail 50
    exit 1
  fi
  sleep 2
done

echo "==> 运行 E2E 测试"
DSH_E2E=1 DSH_E2E_BASE_URL="${BASE_URL}" node --test tests/e2e/*.test.js
