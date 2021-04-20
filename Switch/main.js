const { app, BrowserWindow } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");
//八个渲染进程通过ipcMain模块来和主进程通信，以对窗口对象进行操作（关闭/最小化/端口配置）

let port = [0, 0];

function createIndexWindow() {
  let i = new BrowserWindow({
    width: 385,
    height: 420,
    frame: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });
  i.loadFile("index.html");
}

function createClientWindow() {
  let c = new BrowserWindow({
    width: 385,
    height: 510,
    frame: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true, //enable nodejs integrated
      enableRemoteModule: true,
    },
  });
  c.loadFile("client.html");
}

function createWindow() {
  let m = new BrowserWindow({
    width: 735,
    height: 650,
    frame: false,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  m.loadFile("server.html");
}

app.whenReady().then(() => {
  createIndexWindow();
  // createWindow();createWindow();//两个交换机进程
  // for(let i=0;i<6;i++)  createClientWindow();//六个主机进程
  // createClientWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("mini", (e, v) => {
  console.log(`主进程收到${v}消息，最小化`);
  let tmpWindow = BrowserWindow.fromId(v);
  tmpWindow.minimize();
});

ipcMain.on("quit", (e, v) => {
  console.log(`主进程收到${v}消息，关闭`);
  let tmpWindow = BrowserWindow.fromId(v);
  if (tmpWindow != null) {
    tmpWindow.destroy();
  }
});

ipcMain.on("start", (e, json) => {
  //console.log(`主进程收到${json.id}消息，打开八个进程窗口`);
  //将初始界面设置好的交换机监听端口号通过ipc通信存入主进程的port数组、
  port[0] = json.port1;
  port[1] = json.port2;
  console.log(`主进程收到监听端口配置：${json.port1}、${json.port2}`);
  let tmpWindow = BrowserWindow.fromId(json.id);
  if (tmpWindow != null) {
    // for (let i = 0; i < 6; i++) createClientWindow(); //六个主机进程
    createWindow(); //两个交换机进程
    createWindow();
    createClientWindow();createClientWindow();
    createClientWindow();createClientWindow();
    console.log(`主进程收到${json.id}消息，关闭初始配置窗口`);
    tmpWindow.destroy();
  }
});

ipcMain.on("req_port", (e, id) => {
  console.log(`主进程收到来自${id}窗口的获取端口配置请求`);
  //event.reply():监听到请求后，主进程异步回复消息
  e.reply("get_port", {
    port1: port[0],
    port2: port[1], //返回端口配置
  });
  console.log(`主进程已向${id}窗口返回端口配置`);
});
