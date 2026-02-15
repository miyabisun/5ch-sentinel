# 5ch アクセス仕様

5ch-sentinel が 5ch から情報を取得する際のエンドポイント・フォーマット・ルールをまとめる。

## User-Agent

5ch へのリクエストには `Monazilla/1.00` を含む User-Agent が必要。
本ツールでは `Monazilla/1.00` の後に Chrome の User-Agent を付加した文字列を使用する。

## スレッド URL のフォーマット

以下の 2 形式をサポートする。

```
https://{server}.5ch.net/test/read.cgi/{board}/{thread_id}/   (標準形式)
https://{server}.5ch.net/{board}/{thread_id}/                  (レガシー/短縮形式)
```

例:
```
https://eagle.5ch.net/test/read.cgi/livejupiter/1234567890/
```

この URL から `server=eagle`, `board=livejupiter`, `threadId=1234567890` を抽出する。

## subject.txt — スレッド一覧の取得

### エンドポイント

```
GET https://{server}.5ch.net/{board}/subject.txt
```

### レスポンス

- **文字コード**: Shift_JIS (iconv-lite でデコード)
- **フォーマット**: 1 行 1 スレッド

```
{thread_id}.dat<>{タイトル} ({レス数})
```

例:
```
1234567890.dat<>テストスレッド Part10 (985)
9876543210.dat<>雑談スレ Part42 (123)
```

### パース結果

各行から以下のオブジェクトを生成する。

```json
{ "threadId": "1234567890", "title": "テストスレッド Part10", "resCount": 985 }
```

不正な行や空行はスキップされる。

## dat ファイル — サイズチェック

スレッドの dat ファイルサイズを確認するために HEAD リクエストを使用する。

### エンドポイント

```
HEAD https://{server}.5ch.net/{board}/dat/{thread_id}.dat
```

### レスポンス

`Content-Length` ヘッダからバイト数を取得し、KB に変換する。
このチェックはレス数が `resThresholdForSizeCheck` (デフォルト 900) を超えた場合にのみ実行される。

## 次スレ検索のアルゴリズム

1. 現在のスレッドタイトルから数字を全て抽出する
2. 右端の数字から順にインクリメントして候補を生成する（Part 番号は通常タイトル末尾に近い）
3. subject.txt の各エントリに対して、タイトルの前後のコンテキスト文字列（最大 6 文字）とインクリメント後の数字の両方を含むかを判定する
4. ゼロパディングされた番号も試行する（例: Part09 → Part10）
5. 前後のコンテキストが両方とも空の場合（タイトルが数字のみ）はスキップする

例:
- `テストスレ Part10` → `Part` + `11` を含むエントリを検索 → `テストスレ Part11` にマッチ
- `5ch総合 Part3` → 右端の `3` を先に試行 → `5ch総合 Part4` にマッチ
