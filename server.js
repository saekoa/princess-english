const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

// RenderのEnvironmentで設定した GEMINI_API_KEY を読み込みます
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY が設定されていません。RenderのEnvironment設定を確認してください。');
  process.exit(1);
}

// ベルの性格設定
const SYSTEM_PROMPT = `You are Princess Belle from Beauty and the Beast. Warm, gracious, and magical. 
Keep replies VERY SHORT (1-2 sentences). Use simple English. NEVER correct grammar.`;

/**
 * Gemini API を呼び出す関数
 */
async function callGemini(history) {
  // 履歴が正しく届かなかった場合のバックアップ（空なら初期挨拶を入れる）
  const safeHistory = (history && Array.isArray(history) && history.length > 0) 
    ? history 
    : [{ role: 'user', content: 'Hello, Belle!' }];

  // Geminiのデータ形式（role: 'model' か 'user'）に変換
  const contents = safeHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const body = JSON.stringify({
    contents: contents,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: { 
      maxOutputTokens: 200,
      temperature: 0.7
    }
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      // ここを「gemini-1.5-flash-latest」に変更します
      path: `/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.error) {
            return reject(new Error(json.error.message));
          }

          if (json.candidates && json.candidates[0] && json.candidates[0].content) {
            resolve(json.candidates[0].content.parts[0].text);
          } else {
            console.error("Gemini Response Error:", JSON.stringify(json));
            reject(new Error("Geminiから有効な返答が得られませんでした。"));
          }
        } catch(e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(body);
    req.end();
  });
}

/**
 * サーバー本体の設定
 */
const server = http.createServer(async (req, res) => {
  // CORSの設定（ブラウザからの通信を許可）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // AIへのリクエスト処理
  if (req.method === 'POST' && req.url === '/api/belle') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const history = parsed.history;
        
        console.log("Processing message...");
        const reply = await callGemini(history);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply: reply }));
      } catch(e) {
        console.error("Error in /api/belle:", e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 画面（index.html）を表示する処理
  if (req.method === 'GET') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  }
});

// Renderで使用するポート設定
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Gemini Server is running on port ${PORT}`);
});
