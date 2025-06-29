let droppedFile;
let currentFilePath;

const dropArea = document.getElementById('drop-area');
const log = document.getElementById('log');
const fileDirectory = document.getElementById('file-directory');

const alwaysOnTopCheckbox = document.getElementById('always-on-top-checkbox');
const experimentalCheckbox = document.getElementById('experimental-checkbox');
const experimentalLabel = document.getElementById('experimental-label')

const successSound = new Audio('../../assets/confirm-sfx.mp3')
const errorSound = new Audio("../../assets/error-sfx.ogg")

successSound.volume = 0.2
errorSound.volume = 0.15

alwaysOnTopCheckbox.addEventListener('click', (e) => {
    window.electron.setAlwaysOnTopStatus(alwaysOnTopCheckbox.checked);
})

dropArea.addEventListener('dragover', (e) => {
    e.stopPropagation();
    e.preventDefault();
    dropArea.classList.add('highlight');
});

dropArea.addEventListener('dragleave', (e) => {
    e.stopPropagation();
    e.preventDefault();
    dropArea.classList.remove('highlight');
});

dropArea.addEventListener('drop', (e) => {
    e.stopPropagation();
    e.preventDefault();

    dropArea.classList.remove('highlight');

    const files = e.dataTransfer.files;

    selectPngFile(files[0]);
});

dropArea.addEventListener('click', async (e) => {
    e.preventDefault();

    const result = await window.electron.selectPngFile();
    if (result) {
        const { file, path } = result;
        selectPngFile(file, path);
        console.log(path);
    }
})

document.getElementById('start-process').addEventListener('click', async (e) => {
    const date = new Date();
    const time = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date);

    if (currentFilePath === "") {
        errorSound.play();
        log.classList.add('error');
        log.textContent = `[${time}] No file selected.`;
        return;
    }

    log.classList.remove('error', 'success');

    const filepath = currentFilePath;
    currentFilePath = "";

    const result = await window.electron.fixPixels(filepath, experimentalCheckbox.checked);
    if (result.startsWith('No transparent pixels')) {
        errorSound.play();
        log.classList.add('error');
    } else {
        successSound.play();
        log.classList.add('success');
    }
    log.textContent = `[${time}] ${result}`;
});

function selectPngFile(file, path) {
    log.classList.remove('error', 'success');
    droppedFile = file;
    currentFilePath = path ? path : window.electron.showFilePath(droppedFile);

    if (file.size > 20000) {
        experimentalLabel.innerHTML = `Experimental Processor <span class="recommended-highlight">RECOMMENDED</span>`
    } else {
        experimentalLabel.innerHTML = `Experimental Processor`
    }

    fileDirectory.innerHTML = `Uploaded file: <span class="code-highlight">${currentFilePath}</span>`

    const date = new Date();
    const time = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date);

    log.textContent = `[${time}] ${droppedFile.name} has been uploaded.`;
}