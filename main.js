// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const robot = require('robotjs');

let mainWindow;

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
    icon: path.join(__dirname, 'assets', 'dragon.png'), // optional
  });

  // Load the UI from ui.js (we'll serve a data URL or inline)
  const uiHTML = require('./ui.js').getUIHTML();
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(uiHTML)}`);

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---------- IPC Handlers for Secure System Automation ----------
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

// Show confirmation dialog from main process
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
  return result.response === 1; // true if YES clicked
});

// Window controls
ipcMain.on('window-minimize', () => { mainWindow.minimize(); });
ipcMain.on('window-close', () => { mainWindow.close(); });
