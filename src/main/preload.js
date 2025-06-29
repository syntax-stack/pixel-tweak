const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    fixPixels: (filePath, experimentalMode) => {
        return ipcRenderer.invoke('fix-pixels', filePath, experimentalMode);
    },
    selectPngFile: async () => {
        const result = await ipcRenderer.invoke('select-png-file');
        if (!result) return null;

        const buffer = Buffer.from(result.data, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });

        const file = new File([blob], result.name, { type: 'image/png' });

        return {
            file,
            path: result.path
        };
    },
    showFilePath: (file) => {
        return webUtils.getPathForFile(file);
    },
    setAlwaysOnTopStatus: (status) => {
        ipcRenderer.send('set-always-on-top', status);
    }
});