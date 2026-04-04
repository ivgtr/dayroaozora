# DayroAozora

## Commands

```bash
pnpm dev          # 開発サーバー (localhost:3000)
pnpm build        # プロダクションビルド
pnpm lint         # ESLint
pnpm test         # Vitest
pnpm test:watch   # Vitest (ウォッチモード)
```

変更後は `pnpm build && pnpm lint && pnpm test` で検証する。

## References

プロジェクトのドメイン知識・設計判断・要件は [.docs/README.md](.docs/README.md) を参照。

## Active Technologies
- TypeScript 6.0.2 / Next.js 16.2.2 (App Router) + React 19.2.4, Next.js 16.2.2 (002-reading-experience)
- localStorage（TodayState） (002-reading-experience)
- TypeScript 6.0.2 + Next.js 16.2.2 (App Router), React 19.2.4 (003-completion-bookshelf)
- localStorage (`dayro:bookshelf`, `dayro:streak`, `dayro:today`), IndexedDB (`content_cache` — Phase 2 で実装済み前提) (003-completion-bookshelf)
- TypeScript 6.0.2 + Next.js 16.2.2 (App Router) / React 19.2.4（新規依存なし） (004-cache-data)
- IndexedDB (`"dayroaozora"` DB, `"content_cache"` store) + 既存 localStorage (004-cache-data)
- TypeScript 6.0.2 / Next.js 16.2.2 (App Router) + React 19.2.4 + next@16.2.2, react@19.2.4（新規依存なし） (005-social-polish)
- localStorage (`dayro:theme` 新規追加) + 既存 localStorage/IndexedDB (005-social-polish)

## Recent Changes
- 002-reading-experience: Added TypeScript 6.0.2 / Next.js 16.2.2 (App Router) + React 19.2.4, Next.js 16.2.2
