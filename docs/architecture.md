# アーキテクチャ

## 採用技術

| 分類 | 技術 | 用途 |
|---|---|---|
| ランタイム | Node.js (ESM) | アプリケーション実行 |
| データベース | SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) | 監視対象スレッドの永続化 |
| 文字コード変換 | [iconv-lite](https://github.com/ashtuchkin/iconv-lite) | 5ch の Shift_JIS レスポンスを UTF-8 にデコード |
| Discord 通知 | [discord.js](https://discord.js.org/) | Discord チャンネルへのメッセージ送信 |
| 環境変数 | [dotenv](https://github.com/motdotla/dotenv) | `.env` ファイルから設定を読み込み |
| 対話型 CLI | [@inquirer/select](https://github.com/SBoudrias/Inquirer.js), [@inquirer/input](https://github.com/SBoudrias/Inquirer.js) | セットアップ時のチャンネル選択・トークン入力 |
| テスト | [vitest](https://vitest.dev/) | ユニットテスト |

## ディレクトリ構成

```
index.js                  エントリポイント (main 関数・設定値)
scripts/
  add.js                  スレッド登録 CLI
  delete.js               監視対象削除 CLI (対話型)
  find_url.js             スレタイ検索 CLI (find.5ch.net)
  setup.js                対話型セットアップ (トークン入力・チャンネル選択・.env 書き込み)
.env.example              環境変数テンプレート
src/
  functions/              純粋関数 (副作用なし・テスト対象)
    build-message.js        通知メッセージ組み立て
    find-next-thread.js     次スレ検索
    format-thread-stat.js   ログ用ステータス整形
    group-threads-by-board.js  スレッドの板別グルーピング
    parse-subject.js        subject.txt パース
    parse-thread-url.js     URL 解析
  modules/                副作用を伴うモジュール (DB・HTTP・I/O)
    database.js             SQLite の初期化・CRUD
    checker.js              スレッドチェックのオーケストレーション
    http.js                 HTTP リクエスト (GET / HEAD) + リトライ
    discord.js              Discord への通知送信 + リトライ
    logger.js               タイムスタンプ付きログ出力
test/
  functions/              純粋関数のテスト (31テスト)
    parse-thread-url.test.js
    parse-subject.test.js
    find-next-thread.test.js
    build-message.test.js
```

### functions と modules の区分

- **functions** — 入力から出力を返すだけの純粋関数。外部 I/O に依存せず、単体テストが容易。
- **modules** — DB アクセス・HTTP 通信・ターミナル出力など副作用を伴う処理。設定値は `index.js` からパラメータとして受け取る。

## 設定値 (`index.js` の config)

| キー | デフォルト値 | 説明 |
|---|---|---|
| `resWarningThreshold` | 980 | レス数がこの値以上で警告 |
| `datSizeWarningKB` | 900 | dat サイズ (KB) がこの値以上で警告 |
| `resDeadThreshold` | 1002 | レス数がこの値以上で死亡 |
| `datSizeDeadKB` | 1024 | dat サイズ (KB) がこの値以上で死亡 (≈1,048,576 bytes = dat 上限) |

## データベーススキーマ

`sentinel.db` に `threads` テーブルが 1 つ存在する。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER (PK) | 自動採番 |
| `url` | TEXT NOT NULL | スレッド URL |
| `title` | TEXT | subject.txt から取得したタイトル (自動更新) |
| `status` | TEXT DEFAULT 'active' | 'active' / 'warned' / 'dead' |
| `deleted_at` | INTEGER | 論理削除日時 (UNIX タイムスタンプ)。世代交代時に設定 |
| `created_at` | INTEGER | 作成日時 (UNIX タイムスタンプ) |

## データフロー

```
[60秒間隔のタイマー (tick)]
  │
  ▼
runCheck(db, config) → stats[]
  │
  ├─ getActiveThreads(db)         … 監視対象スレッドを DB から取得
  │
  ├─ server+board ごとにグルーピング
  │
  ├─ fetchBuffer(subject.txt)     … 板の全スレッド一覧を取得 (板単位で1回)
  │   └─ iconv.decode(Shift_JIS)
  │   └─ parseSubjectTxt(text)
  │
  └─ スレッドごとに checkThread() → stat
      │
      ├─ subject.txt に存在しない → dat落ちとして即 dead
      ├─ subject.txt からレス数を確認
      ├─ headContentLength(dat) で dat サイズ取得
      │   (初回は必ず取得。レス数が増加した場合のみ再取得。Accept-Encoding: identity で content-length を保証)
      │   404 → datGone (dat消失) として dead。5xx → リトライ後にログ警告
      ├─ 死亡条件判定 (レス数 ≥ 1002 or dat ≥ 1024KB or datGone)
      ├─ 警告条件判定 (レス数 ≥ 980 or dat ≥ 900KB、active のみ)
      ├─ notifyAndSetStatus():
      │   ├─ findNextThread() で次スレ検索
      │   ├─ 次スレ発見時 → addThread() で DB に自動登録 + softDelete() で旧スレ論理削除 (世代交代)
      │   ├─ buildWarningMessage() で通知本文を組み立て
      │   ├─ notifyDiscord() で送信
      │   └─ setStatus(db, id, status)

  ▼
index.js の tick()
  ├─ stats[] をループし、各スレッドの判定結果 (正常/警告/死亡) ・レス数・dat サイズをログ出力
  └─ 正常/警告/死亡の件数をログ出力
```

## HTTP リトライ

全 HTTP リクエストにリトライ機構を実装済み。定数名は `MAX_ATTEMPTS` で統一。

| モジュール | 対象 | 試行回数 | リトライ戦略 |
|---|---|---|---|
| `http.js` | subject.txt 取得 / dat HEAD | 計 4 回 | 固定間隔 2 秒 |
| `discord.js` | Discord メッセージ送信 | 計 3 回 | 指数バックオフ (1s, 2s, 4s) |

全試行失敗時、`http.js` は例外を throw し呼び出し元の `checker.js` でログ出力、`discord.js` はエラーログを出力して return する。

## 5ch への負荷軽減策

- subject.txt は板単位でグルーピングして **1 回だけ**取得
- dat HEAD リクエストは `prevStats` (モジュール内 Map) でレス数を追跡し、**レス数が増加した時のみ**実行（初回は必ず実行）
- HEAD リクエストに `Accept-Encoding: identity` を付与し、Cloudflare の圧縮による `Content-Length` ヘッダ消失を防止
