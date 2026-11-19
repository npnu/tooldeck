# ToolDeck

Windows 向けオールインワン便利アプリ。クリップボード履歴、ダウンロード、スクショ/OCR、テキスト変換、画像・PDF変換、QR、パスワード、カラー、メモを1つにまとめています。

## 必要なもの

- Node.js 18 以上
- Windows 10/11

## セットアップ

```powershell
cd C:\ToolDeck
npm install
```

### ダウンロード機能の準備（自動セットアップ）

yt-dlp / FFmpeg は**初回起動時に自動でダウンロード**されます（設定で無効化可能）。
ダウンロード画面・設定画面に進捗が表示され、完了すると「準備完了」になります。

- 保存先: `%APPDATA%\tooldeck\bin\`（Program Files にインストールしても書き込み可能）
- 取得元: yt-dlp は GitHub の latest release、FFmpeg は BtbN/FFmpeg-Builds の win64 gpl ビルド
- ダウンロード画面 / 設定画面の「更新」「今すぐ再セットアップ」で最新版に差し替えできます

手動で配置したい場合は `bin/` に `yt-dlp.exe` と `ffmpeg.exe` を置いてもOKです（こちらが優先されます）。
自動セットアップを止めたい場合は、設定画面の「起動時に yt-dlp / FFmpeg が無ければ自動ダウンロードする」をオフにしてください。

## 起動

開発モード（Vite + Electron）:

```powershell
npm run dev
```

ビルド（exe / インストーラー）:

```powershell
npm run dist
```

`release/` に NSIS インストーラーと portable exe が生成されます。

## 主な機能

| 機能 | 内容 |
|---|---|
| クリップボード | テキスト/画像/ファイルの履歴を自動保存。検索、ピン留め、スニペット、ダブルクリックで貼り付け |
| ダウンロード | yt-dlp ベース。MP4/MP3、画質指定、プレイリスト、字幕、キューと進捗表示 |
| スクリーンショット | 範囲選択キャプチャ + Tesseract.js による OCR（日本語/英語） |
| テキストツール | 全角/半角、大小文字、JSON整形、HTML除去、URLエンコード、MD5/SHA-1/256/512 |
| ファイルツール | 画像形式変換・リサイズ・圧縮、PDF結合/分割、一括リネーム |
| QRコード | 生成と画像からの読み取り |
| パスワード | 安全な乱数生成と強度メーター |
| カラー | HEX/RGB/HSL 変換とパレット生成 |
| メモ | アプリ内に保存する簡易メモ |

グローバルショートカット（既定）:

- `Ctrl+Shift+V` … クリップボード履歴
- `Ctrl+Shift+D` … ダウンロード画面
- `Ctrl+Shift+S` … 範囲キャプチャ

トレイアイコンのダブルクリックでウィンドウを表示/非表示できます。

## 自動更新について

`package.json` の `build.publish` に GitHub リポジトリの `owner` / `repo` を設定してください。
`npm run dist` でビルドしたアプリは、GitHub Releases にアップロードした新しいバージョンを自動 detection して通知します。
開発モードでは自動更新は動作しません。

## 補足

- 初回の OCR 実行時は Tesseract.js が言語データをダウンロードするため、数秒かかります（要インターネット）。
- クリップボード履歴と画像は `%APPDATA%\tooldeck` に保存されます。
- yt-dlp は更新が頻繁です。ダウンロードが失敗する場合は `bin/yt-dlp.exe` を最新版に差し替えてください。
