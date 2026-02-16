# 5ch-sentinel

5ch スレッドの終了を検知し、次スレ候補とともに Discord へ通知するモニタリングボット。

## 5ch サーバーへの配慮

本ツールは 5ch サーバーへの負荷を最小限に抑える設計を採用しています。

- **subject.txt の板単位取得** — スレッド一覧 (`subject.txt`) は板ごとに 1 回だけ取得し、同じ板の複数スレッドで共有します。スレッドの本文は一切取得しません。
- **dat ファイルは HEAD リクエストのみ** — dat ファイルの中身はダウンロードせず、HTTP HEAD リクエストで `Content-Length`（ファイルサイズ）だけを確認します。
- **差分検知による省リクエスト** — dat の HEAD リクエストは、subject.txt 上でレス数の増加を検知した場合にのみ実行します。レス数に変化がなければ前回の値を再利用し、不要なリクエストを発生させません。

## 必要環境

- Node.js 18 以上
- Discord Bot トークン（[Discord Developer Portal](https://discord.com/developers/applications) で作成）

## セットアップ

```bash
npm install
npm run setup
```

対話形式で Discord Bot トークンの入力と通知先チャンネルの選択を行い、`.env` に自動書き込みする。

## スレッド検索

```bash
npm run find -- <検索ワード>
```

`find.5ch.net` のスレタイ検索を利用して、キーワードに一致するスレッドの一覧を表示する。
結果は古い順に表示され、最新のスレッドが一番下に来る。

## 監視対象の登録

```bash
npm run add -- <スレッドURL>
```

例:
```bash
npm run add -- "https://eagle.5ch.net/test/read.cgi/livejupiter/1234567890/"
```

URL のバリデーション・重複チェックを行い、SQLite データベース (`sentinel.db`) に登録する。
データベースは初回実行時に自動作成される。

## 監視対象の削除

```bash
npm run delete
```

対話形式で監視中のスレッド一覧を表示し、選択したスレッドを監視対象から除外する。
次スレ自動検出の誤爆を修正する際に使用する。

## 起動

```bash
npm start
```

起動すると 60 秒間隔でスレッドの状態をチェックし、以下の条件を満たすと Discord に警告を送信する。

- レス数が 980 以上
- dat ファイルサイズが 900KB 以上

警告は各スレッドにつき一度だけ送信される。警告済みのスレッドは引き続き死亡を監視する。

## 設定値

### 環境変数 (`.env`)

| 変数 | 説明 |
|---|---|
| `DISCORD_TOKEN` | Discord Bot トークン |
| `DISCORD_CHANNEL_ID` | 通知先チャンネル ID (`npm run setup` で確認) |

### アプリケーション設定

`index.js` 先頭の `config` オブジェクトで変更できる。

| キー | デフォルト値 | 説明 |
|---|---|---|
| `userAgent` | `Monazilla/1.00 Mozilla/5.0 ...Chrome/133...` | 5ch へのリクエストに使う User-Agent |
| `resThresholdForSizeCheck` | `900` | dat サイズチェックを開始するレス数 |
| `resWarningThreshold` | `980` | レス数の警告閾値 |
| `datSizeWarningKB` | `900` | dat サイズの警告閾値 (KB) |

その他、`DB_PATH` (データベースファイルパス) と `CHECK_INTERVAL_MS` (チェック間隔 ms) も同じ箇所で定義されている。

## テスト

```bash
npm test
```

## 詳細ドキュメント

- [アーキテクチャ](docs/architecture.md) — プロジェクト構成・採用技術・データフロー
- [5ch アクセス仕様](docs/5ch-access.md) — subject.txt / dat ファイルの取得方法とフォーマット
