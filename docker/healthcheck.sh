#!/bin/sh
# 健康检查：评测方案接口返回 JSON 才算就绪（插件已加载）。
set -e
curl -fsS "http://127.0.0.1:3080/api/agent-observe/evaluation-profiles" | grep -q '"profiles"'
