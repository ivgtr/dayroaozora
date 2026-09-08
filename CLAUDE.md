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

サービスの説明は [README.md](README.md)、本文取得・キャッシュ・読書位置の設計は [docs/architecture.md](docs/architecture.md) を参照。
