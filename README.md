# DayroAozora

毎日ひとつ、ランダムな青空文庫の作品が読めるサイトです。

## 特徴

- 日替わり1作品（全ユーザー共通）
- タップで一文ずつ出現するタイプライター表示
- タイトル・著者は読了まで非表示
- 本棚にお気に入りを保存
- 連続読了ストリーク・読了共有
- ダークモード対応

## 注意事項

- 作品データは[青空文庫](https://www.aozora.gr.jp/)から取得しています（著作権保護期間の満了した作品が対象）
- 読書履歴・本棚はブラウザに保存されるため、ブラウザデータの削除で消去されます

## License

MIT

公式取得移行の横断記録は [libroaozoraのリリース資料](https://github.com/ivgtr/libroaozora/blob/codex/official-origin-fetch/docs/investigations/official-origin-release.md) を参照してください。
保存障害の継続時はサーバー設定 `PREFETCH_ENABLED=false` で翌日先読みを停止できます。通常閲覧は継続し、先読み要求は中継で204/no-storeを返します。本文読込み全体の期限は40秒です。
