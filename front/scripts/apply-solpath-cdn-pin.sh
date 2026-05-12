#!/usr/bin/env bash
# jsDelivr 핀: `SOLPATH_CDN_COMMIT` 풀 SHA → IMWEB_* 의 URL·주석·cdnCommit 일괄 치환
# 모노레포: .../solpath-dashboard@<sha>/front/…  ·  구 -front 전용 URL도 호환 치환
# 반드시 `front/SOLPATH_CDN_COMMIT`을 **최종**으로 쓴 **다음**에만 실행(병렬 X).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIN="${ROOT}/SOLPATH_CDN_COMMIT"
if [[ ! -f "$PIN" ]]; then
  echo "없음: $PIN" >&2
  exit 1
fi
NEW=$(
  grep -E '^[0-9a-f]{7,40}$' "$PIN" | head -1 | tr '[:upper:]' '[:lower:]'
)
if [[ -z "$NEW" ]]; then
  echo "SOLPATH_CDN_COMMIT에서 7~40자 16진 커밋 1줄을 찾지 못함 (주석 # 줄은 무시됨)" >&2
  exit 1
fi
# jsDelivr gh URL: **풀 SHA(40자)** — solpath-labs-dev 등에서 7자 짧은 ref가 404로 떨어지는 사례가 있음.
# cdnCommit·SOLPATH_PIN 주석도 동일 풀 SHA.
NEW_SHORT="${NEW:0:7}"
export NEW
export NEW_SHORT
for f in \
  "${ROOT}/IMWEB_SNIPPET_INJECT.html" \
  "${ROOT}/IMWEB_SNIPPET.html" \
  "${ROOT}/IMWEB_SNIPPET_PLAN.html"; do
  if [[ ! -f "$f" ]]; then
    echo "없음: $f" >&2
    exit 1
  fi
  perl -i -pe '
    s/(eunsang9597\/solpath-dashboard@)[0-9a-fA-F]+/${1}$ENV{NEW}/g;
    s/(solpath-labs-dev\/solpath-dashboard@)[0-9a-fA-F]+/${1}$ENV{NEW}/g;
    s/(eunsang9597\/solpath-dashboard-front@)[0-9a-fA-F]+/${1}$ENV{NEW}/g;
    s/(solpath-labs-dev\/solpath-dashboard-front@)[0-9a-fA-F]+/${1}$ENV{NEW}/g;
    s/(cdnCommit:\s*")([0-9a-fA-F]+)"/$1$ENV{NEW}"/g;
    s/(<!--\s*SOLPATH_PIN:\s*)[0-9a-fA-F]+/${1}$ENV{NEW}/g;
    s/(<!--\s*SOLPATH_PIN\(iframe\):\s*)[0-9a-fA-F]+/${1}$ENV{NEW}/g;
  ' "$f" || {
    echo "perl 치환 실패: $f" >&2
    exit 1
  }
  echo "OK $f  →  jsDelivr @$NEW (짧은 ref ${NEW_SHORT} = 대조용)"
done
echo "끝. jsDelivr·cdnCommit·SOLPATH_PIN 주석 모두 풀 SHA $NEW"
