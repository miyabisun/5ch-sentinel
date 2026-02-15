# アーキテクチャ

## 採用技術

| 分類 | 技術 | 用途 |
|---|---|---|
| ランタイム | Node.js (ESM) | アプリケーション実行 |
| データベース | SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) | 監視対象スレッドの永続化 |
| 文字コード変換 | [iconv-lite](https://github.com/ashtuchkin/iconv-lite) | 5ch の Shift_JIS レスポンスを UTF-8 にデコード |
| ターミナル UI | [single-line-log](https://github.com/mafintosh/single-line-log) | ステータスバーの描画 |
| テスト | [vitest](https://vitest.dev/) | ユニットテスト |

## ディレクトリ構成

```
index.js                  エントリポイント (main 関数・設定値)
add.js                    スレッド登録 CLI
find_url.js               スレタイ検索 CLI (find.5ch.net)
src/
  functions/              純粋関数 (副作用なし・テスト対象)
    parse-thread-url.js     URL 解析
    parse-subject.js        subject.txt パース
    find-next-thread.js     次スレ検索
    build-message.js        通知メッセージ組み立て
  modules/                副作用を伴うモジュール (DB・HTTP・I/O)
    database.js             SQLite の初期化・CRUD
    checker.js              スレッドチェックのオーケストレーション
    http.js                 HTTP リクエスト (GET / HEAD)
    discord.js              Discord への通知送信
    logger.js               タイムスタンプ付きログ出力
    status.js               ターミナルステータスバー・スレッド統計
test/
  functions/              純粋関数のテスト
    parse-thread-url.test.js
    parse-subject.test.js
    find-next-thread.test.js
    build-message.test.js
```

### functions と modules の区分

- **functions** — 入力から出力を返すだけの純粋関数。外部 I/O に依存せず、単体テストが容易。
- **modules** — DB アクセス・HTTP 通信・ターミナル出力など副作用を伴う処理。設定値は `index.js` からパラメータとして受け取る。

## データベーススキーマ

`sentinel.db` に `threads` テーブルが 1 つ存在する。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER (PK) | 自動採番 |
| `url` | TEXT NOT NULL | スレッド URL |
| `title` | TEXT | subject.txt から取得したタイトル (自動更新) |
| `warned` | INTEGER | 0: 未警告 / 1: 警告済み |
| `deleted_at` | INTEGER | 論理削除日時 (UNIX タイムスタンプ) |
| `created_at` | INTEGER | 作成日時 (UNIX タイムスタンプ) |

## データフロー

```
[60秒間隔のタイマー]
  │
  ▼
runCheck(db, config)
  │
  ├─ getActiveThreads(db)         … 監視対象スレッドを DB から取得
  │
  ├─ server+board ごとにグルーピング
  │
  ├─ fetchBuffer(subject.txt)     … 板の全スレッド一覧を取得
  │   └─ iconv.decode(Shift_JIS)
  │   └─ parseSubjectTxt(text)
  │
  └─ スレッドごとに checkThread()
      │
      ├─ subject.txt からレス数を確認
      ├─ 閾値超過時: headContentLength(dat) で dat サイズ取得
      ├─ 警告条件判定 (レス数 ≥ 980 or dat ≥ 980KB)
      ├─ findNextThread() で次スレ候補を検索
      ├─ buildWarningMessage() で通知本文を組み立て
      ├─ notifyDiscord() で送信
      └─ markWarned(db, id)
```
