# 5ch-sentinel

5ch スレッドの終了を検知し、次スレ候補とともに Discord へ通知するモニタリングボット。

## 必要環境

- Node.js 18 以上
- Discord 通知を受け取るための HTTP エンドポイント（デフォルト: `http://localhost:5000/discord/channels`）

## セットアップ

```bash
npm install
```

## スレッド検索

```bash
npm run find -- <検索ワード>
```

`find.5ch.net` のスレタイ検索を利用して、キーワードに一致するスレッドの一覧を表示する。
結果は古い順に表示され、最新のスレッドが一番下に来る。

## 監視対象の登録

```bash
node add.js <スレッドURL>
```

例:
```bash
node add.js "https://eagle.5ch.net/test/read.cgi/livejupiter/1234567890/"
```

URL のバリデーション・重複チェックを行い、SQLite データベース (`sentinel.db`) に登録する。
データベースは初回実行時に自動作成される。

## 起動

```bash
npm start
```

起動すると 60 秒間隔でスレッドの状態をチェックし、以下の条件を満たすと Discord に警告を送信する。

- レス数が 980 以上
- dat ファイルサイズが 980KB 以上

警告送信後、そのスレッドは `warned` としてマークされ、以降のチェック対象から外れる。

## 設定値

`index.js` 先頭の `config` オブジェクトで変更できる。

| キー | デフォルト値 | 説明 |
|---|---|---|
| `userAgent` | `Monazilla/1.00 Mozilla/5.0 ...Chrome/133...` | 5ch へのリクエストに使う User-Agent |
| `discordNotifyBase` | `http://localhost:5000/discord/channels` | Discord 通知先の Base URL |
| `resThresholdForSizeCheck` | `900` | dat サイズチェックを開始するレス数 |
| `resWarningThreshold` | `980` | レス数の警告閾値 |
| `datSizeWarningKB` | `980` | dat サイズの警告閾値 (KB) |

その他、`DB_PATH` (データベースファイルパス) と `CHECK_INTERVAL_MS` (チェック間隔 ms) も同じ箇所で定義されている。

## テスト

```bash
npm test
```

## 詳細ドキュメント

- [アーキテクチャ](docs/architecture.md) — プロジェクト構成・採用技術・データフロー
- [5ch アクセス仕様](docs/5ch-access.md) — subject.txt / dat ファイルの取得方法とフォーマット
