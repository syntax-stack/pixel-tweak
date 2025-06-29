import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import * as fs from 'fs/promises';

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 650,
        show: true,
        autoHideMenuBar: true,
        icon: path.join(app.getAppPath(), 'assets', 'pixel-tweak_logo.ico'),
        webPreferences: {
            preload: path.join(app.getAppPath(), 'src', 'main', 'preload.js'),
            contextIsolation: true
        }
    });
    mainWindow.loadFile(path.join(app.getAppPath(), 'src', 'renderer', 'index.html'));
    mainWindow.setResizable(false);
    mainWindow.setAlwaysOnTop(true);
}

import { fixPixels } from "./image-utils.js";

ipcMain.handle('fix-pixels', async (event, filePath, experimentalMode) => {
    return await fixPixels(filePath, { experimentalMode });
});

ipcMain.handle('select-png-file', async (event) => {
    const result = await dialog.showOpenDialog({
        filters: [{ name: 'PNG Images', extensions: ['png'] }],
        properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const fileBuffer = await fs.readFile(filePath);
        return {
            name: path.basename(filePath),
            data: fileBuffer.toString('base64'),
            path: filePath
        };
    }

    return null;
});

ipcMain.on('open-file', (event, path) => {
    shell.openPath(path);
});

ipcMain.on('set-always-on-top', (event, status) => {
    mainWindow.setAlwaysOnTop(status);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})