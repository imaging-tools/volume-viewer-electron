const { ipcMain, app, BrowserWindow } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const exec = require('child_process').execFile;
const {CACHE_DIRECTORY, SERVICE_DIRECTORY} = require('./constants');

// Set up directory /image-service/cache
if (!fs.existsSync(SERVICE_DIRECTORY)) {
    fs.mkdirSync(SERVICE_DIRECTORY);
}
if (!fs.existsSync(`${SERVICE_DIRECTORY}/${CACHE_DIRECTORY}`)) {
    fs.mkdirSync(`${SERVICE_DIRECTORY}/${CACHE_DIRECTORY}`);
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600});

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '../../static/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function sha256(x) {
    return crypto.createHash('sha256').update(x, 'utf8').digest('hex');
}

function getCacheDir(srcPath) {
    let hash = sha256(srcPath);
    return CACHE_DIRECTORY + '/' + hash + '/';
}

function getAtlasName(filename) {
    return filename+'_atlas.json';
}

function getFilePathsAndName(filePath, fileName) {
    const srcPath = path.normalize(filePath);
    const relCachePath = getCacheDir(srcPath);
    const name = fileName || path.basename(srcPath);
    const fullFolderPath = path.join(SERVICE_DIRECTORY, relCachePath);
    const fullAtlasJsonPath = path.join(fullFolderPath, getAtlasName(name));
    return {srcPath, relCachePath, fullFolderPath, fullAtlasJsonPath, name};
}

const sendAtlasToRenderer = (event, fullAtlasJsonPath, relCachePath) => {
    fs.readFile(fullAtlasJsonPath, 'utf8', (err, data) => {
        if (err) {
            console.log("error", err)
        } else {
            const atlas = JSON.parse(data);
            atlas.images = atlas.images.map(i => {
                return {
                    ...i,
                    name: `../${SERVICE_DIRECTORY}/${relCachePath}/${i.name}`
                }
            });
            event.sender.send('atlasCreated', atlas);
        }
    });
};
const createAtlas = (event, filePath, dest, fullAtlasJsonPath, relCachePath) => {
    console.log(`Creating atlas for ${filePath} and caching at ${dest}`);
    exec(path.join(__dirname, '../../', 'convert'), [filePath, dest], (err) => {
        if (err) console.log(err);
        else {
            sendAtlasToRenderer(event, fullAtlasJsonPath, relCachePath);
        }
    });
};
ipcMain.on('filereceived', (event, filePath) => {
    console.log('Received file ' + filePath);
    const {relCachePath, fullAtlasJsonPath} = getFilePathsAndName(filePath);
    const dest = path.join(__dirname, '../../', SERVICE_DIRECTORY, relCachePath);

    if (!fs.existsSync(dest)) {
        console.log('Cache directory not found.', dest);
        fs.mkdirSync(dest);
        createAtlas(event, filePath, dest, fullAtlasJsonPath, relCachePath);
    } else {
        console.log('Cache directory exists, returning cached', dest);
        sendAtlasToRenderer(event, fullAtlasJsonPath, relCachePath);
    }
});
