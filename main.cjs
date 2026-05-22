const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const net = require('net');

// Force production environment so Express serves built static files
process.env.NODE_ENV = 'production';

let mainWindow = null;
let currentPort = 3000;

// Dynamic port finder to prevent port conflicts (e.g. EADDRINUSE)
function findFreePort(startPort, callback) {
  const testServer = net.createServer();
  testServer.unref();
  testServer.on('error', () => {
    findFreePort(startPort + 1, callback);
  });
  testServer.listen(startPort, '127.0.0.1', () => {
    testServer.close(() => {
      callback(startPort);
    });
  });
}

// Helper to poll the express server until it starts listening
function checkServerReady(url, maxAttempts, attempt, callback) {
  http.get(url, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 500) {
      callback(true);
    } else {
      retry();
    }
  }).on('error', () => {
    retry();
  });

  function retry() {
    if (attempt >= maxAttempts) {
      callback(false);
    } else {
      setTimeout(() => checkServerReady(url, maxAttempts, attempt + 1, callback), 200);
    }
  }
}

// Load .env files from current folder or executive folder for custom MongoDB URI support
function loadEnvironmentVariables() {
  const exeDir = path.dirname(process.execPath);
  const potentialEnvPaths = [
    path.join(process.cwd(), '.env'),
    path.join(exeDir, '.env'),
    path.join(app.getAppPath(), '.env')
  ];

  for (const envPath of potentialEnvPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
          // Skip comments
          if (line.trim().startsWith('#')) return;
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = match[2] || '';
            // Strip quotes
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            process.env[key] = value.trim();
          }
        });
        console.log(`Environment variables loaded successfully from: ${envPath}`);
      } catch (err) {
        console.error(`Error loading env file from ${envPath}:`, err);
      }
    }
  }
}

// Start the SQLite/Express backend
let backendError = null;
function startBackend(port) {
  try {
    process.env.PORT = port.toString();
    // Require the bundled production server
    require('./dist/server.cjs');
    console.log(`Standalone local backend started on port ${port}.`);
  } catch (error) {
    backendError = error;
    console.error('Failed to initialize local standalone server:', error);
  }
}

// Beautiful system error HTML template displayed inside the window if initialization crashes
function showErrorPage(error) {
  const errorMsg = error.stack || error.message || String(error);
  const errorHtml = `
  <!DOCTYPE html>
  <html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8">
    <title>تنبيه - خطأ في تشغيل النظام</title>
    <style>
      body {
        background-color: #0f172a;
        color: #f8fafc;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        background-color: #1e293b;
        border: 1px solid #ef4444;
        border-radius: 16px;
        padding: 32px;
        max-width: 650px;
        width: 100%;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
      h1 {
        color: #f87171;
        font-size: 1.6rem;
        margin-top: 0;
        margin-bottom: 12px;
      }
      p {
        color: #cbd5e1;
        font-size: 1rem;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      .code-container {
        background-color: #020617;
        color: #f1f5f9;
        font-family: monospace;
        padding: 16px;
        border-radius: 8px;
        font-size: 0.85rem;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 200px;
        overflow-y: auto;
        text-align: left;
        direction: ltr;
        margin-bottom: 24px;
        border: 1px solid #334155;
      }
      .btn {
        background-color: #3b82f6;
        color: #ffffff;
        border: none;
        padding: 10px 24px;
        border-radius: 6px;
        font-size: 0.95rem;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.15s;
        text-decoration: none;
        display: inline-block;
      }
      .btn:hover {
        background-color: #2563eb;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>🩺 خطأ في تحميل قاعدة البيانات والنواة</h1>
      <p>عذراً، لم نتمكن من تشغيل خادم الاتصال المحلي للعيادة بشكل صحيح. قد يكون السبب مشكلة في الوصول للملفات أو ملف الإعدادات <code>.env</code> أو تعارض في المنافذ.</p>
      <div class="code-container">${errorMsg}</div>
      <p style="font-size: 0.85rem; color: #94a3b8;">نصيحة: تأكد من إغلاق أي نسخة عيادة سابقة في إدارة المهام (Task Manager)، وحاول تشغيل التطبيق كمسؤول (Run as Administrator) إذا استمرت المشكلة.</p>
      <button class="btn" onclick="javascript:window.location.reload();">إعادة محاولة التشغيل</button>
    </div>
  </body>
  </html>
  `;
  if (mainWindow) {
    mainWindow.show();
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    show: true, // Show instantly to prevent background hidden processes
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    autoHideMenuBar: true,
    title: "عيادة الأطفال - Pediatric Clinic Desktop"
  });

  // Display the loaded visual immediately
  const loadingPath = path.join(__dirname, 'loading.html');
  if (fs.existsSync(loadingPath)) {
    mainWindow.loadFile(loadingPath);
  } else {
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<h1>جاري تشغيل النظام...</h1>'));
  }

  // Check if initialization crashed immediately
  if (backendError) {
    setTimeout(() => showErrorPage(backendError), 1500);
    return;
  }

  // Find a free port starting at 3000
  findFreePort(3000, (freePort) => {
    currentPort = freePort;
    startBackend(freePort);

    if (backendError) {
      showErrorPage(backendError);
      return;
    }

    const url = `http://localhost:${freePort}`;

    // Wait for the backend port to become active (Max 75 attempts = 15 seconds)
    checkServerReady(url, 75, 1, (success) => {
      if (success) {
        mainWindow.loadURL(url);
      } else {
        const portError = new Error(`Server failed to start or respond on port ${freePort} within 15 seconds.`);
        showErrorPage(portError);
      }
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Route any external resource or documentation clicks to default browser, but keep internal layouts inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1') || url.startsWith('file://')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Initialise app
app.whenReady().then(() => {
  loadEnvironmentVariables();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
