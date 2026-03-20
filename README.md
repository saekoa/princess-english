# Princess English 🌹

ディズニーランドのプリンセスと英語会話を練習できるWebアプリです。

## ファイル構成

```
princess-english/
├── index.html   ← フロントエンド（ブラウザ表示）
├── server.js    ← バックエンド（APIキーを管理）
└── README.md
```

## セットアップ手順

### 1. Node.js のインストール
https://nodejs.org/ から LTS版をインストールしてください。

### 2. サーバーの起動

```bash
# ターミナルを開いてフォルダに移動
cd princess-english

# サーバー起動（ANTHROPIC_API_KEY を自分のキーに置き換える）
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx node server.js
```

Windowsの場合:
```cmd
set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
node server.js
```

### 3. ブラウザで開く

```
http://localhost:3000
```

## Web公開する場合（Render.com 推奨・無料）

1. GitHubにリポジトリを作成してファイルをアップロード
2. https://render.com でアカウント作成
3. "New Web Service" → GitHubリポジトリを選択
4. 以下を設定:
   - Build Command: （空欄）
   - Start Command: `node server.js`
   - Environment Variables: `ANTHROPIC_API_KEY` = あなたのキー
5. Deploy → 自動でURLが発行される

## Vercel で公開する場合

Vercelはサーバーレス関数が必要なため、
`/api/belle.js` として以下を追加してください:

```js
export default async function handler(req, res) {
  const { message } = req.body;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: '...',  // SYSTEM_PROMPTをここに
      messages: [{ role: 'user', content: message }]
    })
  });
  const data = await response.json();
  res.json({ reply: data.content[0].text });
}
```
