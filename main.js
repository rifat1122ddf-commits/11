// main.js
const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const robot = require('robotjs');
let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, 'assets', 'dragon.png'),
  });

  const uiHTML = require('./ui.js').getUIHTML();
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(uiHTML)}`);

  mainWindow.on('closed', () => { mainWindow = null; });
  
  // 👇 এই অংশটি যোগ করুন (উইন্ডো বন্ধ করলে ট্রেতে চলে যাবে)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  // একটি ট্রে আইকন ফাইল তৈরি করুন (assets/tray-icon.png) অথবা পথ ঠিক করুন
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'শো', click: () => { mainWindow.show(); } },
    { label: 'বন্ধ', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('Dragon AI Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { mainWindow.show(); });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // 👇 এই অংশটি যোগ করুন (ল্যাপটপ চালু হলে অ্যাপ চালু হবে)
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath
  });
  
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---------- IPC Handlers ----------
ipcMain.handle('run-shell', async (event, command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error.message);
      else resolve(stdout || stderr);
    });
  });
});

ipcMain.handle('mouse-move', (event, x, y) => {
  try {
    robot.moveMouse(x, y);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mouse-click', (event, button = 'left') => {
  try {
    robot.mouseClick(button);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('keyboard-type', (event, text) => {
  try {
    robot.typeString(text);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('confirm-action', async (event, actionDetails) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: '⚠️ Dragon Security Lock',
    message: 'এই সিস্টেম অ্যাকশনটি অনুমতি প্রয়োজন',
    detail: actionDetails,
    buttons: ['বাতিল করুন (NO)', 'অনুমতি দিন (YES)'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  return result.response === 1;
});

ipcMain.on('window-minimize', () => { mainWindow.minimize(); });
ipcMain.on('window-close', () => { app.isQuitting = true; mainWindow.close(); });
