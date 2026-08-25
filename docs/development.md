# 開発フロー

## Dev Container

- ソースコードの変更は bind mount により、コンテナへすぐ反映される。通常はコンテナの再構築は不要。
- `package.json`、`package-lock.json`、`.devcontainer/devcontainer.json` を変更した場合は、VS Code で `Dev Containers: Rebuild and Reopen in Container` を実行する。
- コンテナの作成時に `npm ci` が実行される。依存関係を変更したら、`package-lock.json` も更新してコミットする。
- コンテナを起動すると、Astro の開発サーバーがバックグラウンドで起動し、ポート `4321` が自動転送される。

## Codex のローカル状態

- Codex の設定とローカル状態は、各 Docker ホストの `codex-private-state` 名前付きボリュームに保存する。
- ボリューム名の定義だけをリポジトリで共有し、ボリュームの内容は Git 管理・共有しない。
- このボリュームには認証情報が含まれる可能性がある。削除すると復元できない状態が失われるため、不要な場合だけ削除する。

  ```sh
  docker volume rm codex-private-state
  ```

## GitHub CLI

- Dev Container には GitHub CLI（`gh`）が含まれている。
- 原則: 認証情報は Docker ホストごとの `github-cli-private-state` ボリュームに保存する。
- 禁止: 認証情報を Git 管理・共有しない。

### 初期設定

```sh
gh auth login
gh auth status
```

### 利用例

- リポジトリ・Issue の確認

  ```sh
  gh repo view
  gh issue list
  ```

- PR のチェック結果の確認（現在のブランチに PR がある場合のみ）

  ```sh
  gh pr checks
  ```

### 認証情報の削除

- 注意: ボリュームを削除すると認証状態が失われる。

```sh
docker volume rm github-cli-private-state
```

## Notes

### 仕様

- 記事 URL は `notes/<URLスラッグ>/` とする。
- 原則: URL スラッグは初回公開時にタイトルをもとに決める。
- 禁止: 公開後に URL スラッグを変更しない。
- 記事詳細では、その Discussion のコメント・リアクションを giscus で表示する。

### 管理方法

- 原則: 公開済みの記事は GitHub Discussions の `Articles` カテゴリで管理する。
- 禁止: 下書きを GitHub Discussions に保存しない。

#### 作成・編集

- 厳守: 記事の作成・編集は `Articles` カテゴリの Discussion で行い、投稿フォームの項目をすべて入力する。

#### 公開の取り消し

- `Articles` から別カテゴリへ移動すると、次回のデプロイ後にサイトから非公開になる。
- Discussion を削除すると、次回のデプロイ後にサイトから非公開になる。
- 注意: 別カテゴリへ移動した Discussion は、GitHub Discussions では引き続き公開される。
- 厳守: 機密情報を誤って公開した場合は、キーなどを失効・再発行したうえで Discussion を削除する。
- 注意: 第三者による転載やキャッシュは削除できない場合がある。

### ローカル環境

- `npm run build` と開発サーバーの実行には `GITHUB_TOKEN` が必要。
- `GITHUB_TOKEN` には GitHub Discussions を読み取れるトークンを設定する。
- `.env.example` を参考に、`GITHUB_TOKEN` を `.env` に設定する。
- 禁止: `.env` やトークンを Git 管理しない。

### 自動デプロイ

- 次の場合に自動デプロイされる。
  - `Articles` カテゴリで Discussion を作成・編集・削除する。
  - Discussion を `Articles` カテゴリに移動する。
  - Discussion を `Articles` カテゴリから別のカテゴリへ移動する。
- `Articles` に関係しない Discussion や、コメント・リアクションでは自動デプロイされない。

## 実装と確認

- 実装前に `docs/product.md` と `docs/conventions.md` を確認する。
- 変更後は、必要に応じて開発サーバーで動作を確認する。
- コミット前に次を実行する。

  ```sh
  npm run format:check
  npm run lint
  npm test
  npm run build
  git diff --cached
  ```

### Stylelint

- `npm run lint` には、ESLint と Stylelint のチェックを含める。
- スタイルだけを確認・自動修正する場合は、次を使う。

  ```sh
  npm run lint:styles
  npm run lint:styles:fix
  ```

- VS Code では Stylelint 拡張により、SCSS と Astro 内の SCSS を診断する。
- 保存時の自動修正を有効にしているため、プロパティ順の修正は通常手動で行わない。

## Google Analytics

### 測定 ID

- 測定 ID（`PUBLIC_GA_MEASUREMENT_ID`）は以下の場所で管理する。
  - ローカル: `.env`
  - デプロイ: GitHub の Repository variable
- 測定 ID が未設定の場合、Google タグと同意バナーを出力しない。
- 測定 ID は公開情報。認証情報は Git 管理しない。

### 同意管理

- 厳守: 利用者が許可するまで計測しない。
- 同意はブラウザに保存し、Privacy Policy の「計測のカスタマイズ」から変更できる。

## ブランチと Pull Request

- `main` への直接 push はしない。Issue に対応する変更はブランチで行い、Pull Request を通して `main` へマージする。

### 命名規則

| 作業                     | ブランチ名                      | 例                     |
| ------------------------ | ------------------------------- | ---------------------- |
| Issue に対応する変更     | `<種類>/<Issue番号>-<短い説明>` | `feat/10-about-page`   |
| Issue を作らない文書変更 | `docs/<短い説明>`               | `docs/branch-workflow` |

- `<種類>` には、[コミットメッセージ](conventions.md#コミットメッセージ)で定めた種類を使う。

### Issue 用ブランチの作成

- 原則: 最新の `main` から、上記の命名規則に沿って Issue 用ブランチを作成する。
- 前提:
  - 作業ツリーとインデックスがクリーンである。
  - ローカルの `main` を fast-forward のみで更新し、`origin/main` と一致している。
- 停止条件: 前提を満たせない場合はブランチを作成せず、原因を解消してからやり直す。
- コマンド例:

  ```sh
  git status --short
  git switch main
  git pull --ff-only origin main
  git switch -c <種類>/<Issue番号>-<短い説明>
  ```

### Push と Pull Request

実装とローカル検証が完了したら、変更をコミットしてから次を実行する。

```sh
# 初回だけ。現在のブランチを push し、リモート追跡ブランチを設定する
git push -u origin HEAD

# 2回目以降
git push
```

- `HEAD` は現在チェックアウトしているブランチを指す。ブランチ名を手入力する必要がなく、入力ミスを防げる。
- push 後、`main` 宛ての Pull Request を作成する。
- CI の成功とレビュー完了後、GitHub 上で squash merge する。

## 公開

### 初回設定

- GitHub Pages のデプロイは GitHub Actions で管理する。
- 初回の Pages デプロイ前に、GitHub の **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に一度だけ設定する。

### デプロイと確認

- 公開前に本番ビルドを確認し、リンク、画像、サイトのベースパスが GitHub Pages 上でも正しいことを確認する。
- 公開後は、GitHub Pages の公開 URL でサイトと静的アセットが表示されることを確認する。

### SEO・サイトマップ

#### ビルド時

- `npm run build` を実行する。
- 次のファイルが生成されることを確認する。
  - `dist/sitemap-index.xml`
  - `dist/sitemap-0.xml`
- サイトマップには、検索結果に表示するページだけが含まれることを確認する。

#### 公開後

- 次の URL にアクセスできることを確認する。
  - `https://workingcorgi.com/sitemap-index.xml`
  - `https://workingcorgi.com/robots.txt`
- `robots.txt` にサイトマップの公開 URL が記載されていることを確認する。

### トラブルシューティング

- `actions/configure-pages` が Pages サイトを取得できず失敗した場合は、この公開元設定を確認してから、失敗した workflow を再実行するか次回の `main` push を待つ。
