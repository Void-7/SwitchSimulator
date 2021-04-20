const { ipcRenderer } = require("electron");
const { remote } = require("electron");
let win = remote.getCurrentWindow();
const path = require("path");

let titlebarHandler = new Vue({
  el: "#titlebar",
  methods: {
    minimize() {
      console.log("发送最小化请求到主进程");
      ipcRenderer.send("mini", win.id); //minimize window
    },
    quit() {
      console.log("发送关闭请求到主进程");
      ipcRenderer.send("quit", win.id); //close window
    },
  },
});

let index = new Vue({
  el: "#index_body",
  data: {
    school: path.join(__dirname, "images/nuaa.jpg"),
    avatar: path.join(__dirname, "images/avatar.jpg"),
    port1: undefined,
    port2: undefined,
  },
  methods: {
    start() {
      let reg = new RegExp("^[0-9]*$");
      if (reg.test(this.port1) && reg.test(this.port2)) {
        ipcRenderer.send('start',{
          id:win.id,
          port1:this.port1,
          port2:this.port2
        });
      } else if (this.port2 == null || this.port1 == null) {
        this.$notify.info({
            title: "错误",
          showClose: true,
          message: "监听端口号不得为空！",
          type: "warning",
          position:"top-left"
        });
      } else {
        this.$notify.error({
            title: "错误",
          showClose: true,
          message: "监听端口号只能为数字！",
          position:"top-left"
        });
      }
    },
  },
});
