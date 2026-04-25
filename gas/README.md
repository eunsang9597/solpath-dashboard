# GAS (`solpath-dashboard-backend`)

로컬 소스는 이 디렉터리(`gas/`)이며, **레포 루트**에서 `clasp`를 실행한다. (`rootDir`는 루트의 [.clasp.json](../.clasp.json) 참고.)

## 요구 사항

- 전역 `clasp` 3.x (`clasp login` 완료, 토큰은 `~/.clasprc.json` — git에 넣지 말 것)
- **금지**: `npx @google/clasp@... push` — `access_token` 꼬임이 재현됨 ([process.md](../process.md) 원천·배포 규정)

## 자주 쓰는 명령 (레포 루트에서)

```bash
clasp status
clasp push
clasp pull
clasp open
```

배포(웹앱 URL 갱신)는 Apps Script 편집기에서 **배포 → 새 배포**로 관리한다.

## 파일

- `.gs` / `.js` — Apps Script 소스 (clasp가 `gas/` 아래 동기화)
- `appsscript.json` — 타임존, OAuth 스코프, 런타임 등 (편집 시 주의)
