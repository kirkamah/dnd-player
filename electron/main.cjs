/** Десктоп-обвязка dnd-player: одно окно, рендерер — собранный Vite dist/. */
const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('node:path');

// Тёмный нативный заголовок окна — в тон фону приложения (#0b0d11).
nativeTheme.themeSource = 'dark';

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0b0d11',
    autoHideMenuBar: true,
    title: 'DnD Player',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: { sandbox: true },
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
