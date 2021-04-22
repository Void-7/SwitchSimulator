const net = require("net");
const { ipcRenderer } = require("electron");
const { remote } = require("electron");
const { Socket } = require("dgram");
let win = remote.getCurrentWindow();

let input = [0, 0];
ipcRenderer.send("req_port", win.id);
ipcRenderer.on("get_port", (e, j) => {
  input[0] = j.port1;
  input[1] = j.port2;
  console.log(`${win.id}窗口从主进程获取到端口设置：${input[0]}、${input[1]}`);
});
let board;
let s;
let lflag = 0;
let sflag = 0;

let Timer=setInterval(()=>{
  if(board.table_mac.length){
    // console.log(">>>帧交换表有记录，更新每一项...")
    board.table_mac.forEach((e,i,t)=>{
      if(e.ttl-1>0){
        e.ttl--;//帧交换记录的老化时间每秒自减
      }else{
        t.splice(i,1);//删除从索引i开始的一项记录，即老化的帧交换记录项
      }
    })
  }
  // else{
  //   console.log(">>>帧交换表暂无记录...")
  // }
},1000);


//交换机工作过程核心函数
function core(msg) {
  let data=JSON.stringify(msg);
  //处理数据转发包的过程
  //加入活动日志记录
  add_log(
    `源${msg.src}通过接口${msg.interface}请求向目的${msg.dst}发送数据包：${msg.content} | ${msg.date}`
  );
  //1、将源地址加入缓存表
  let found = 0; //用于记录表中是否存在源地址的标志位
  board.table_mac.forEach((e) => {
    if (e.mac == msg.src) {
      //表中存在源地址项，更新接口和ttl
      e.ttl=60;
      e.port=msg.interface;
      found = 1;
    }
  });
  if (!found){
    //表中不存在源地址项，压入表中
    board.table_mac.push({
      mac: msg.src,
      port: msg.interface,
      ttl: 60,
    });
    board.$nextTick(() => {
      let container = board.$el.querySelectorAll(".el-table__body-wrapper");
      // console.log(container[0]);//第二个是table_log 第一个是table_mac
      container[0].scrollTop = container[0].scrollHeight;
    });
  }

  found = 0; //重新用于记录表中是否存在目标地址的标志位
  let dst = msg.dst;
  let inter = msg.interface;
  board.table_mac.forEach((e, i) => {
    if (e.mac == dst) {
      //交换表中存在目标地址项
      add_log(`交换机表中找到了目标地址项:${e.mac}|${e.port}|${e.ttl}。`);
      found = 1;
      if (e.port != inter) {
        //其接口与帧进入的接口不同，向该接口转发
        if(s.INTERFACE[e.port - 1]!=0){
          add_log(`向接口${e.port}转发消息。`);
          s.INTERFACE[e.port - 1].write(data);
        }else{
          add_log(`接口${e.port}目前无连接，不可达。`);
        }
      }
    }
  });
  if (!found) {
    //交换表中不存在目标地址项，向其他接口转发（除源）
    add_log(`交换机表中未找到目标地址${dst}的项,即将洪范。`);
    add_log(`向除源地址${msg.src}的其它接口转发消息。`);
    s.INTERFACE.forEach((e, i) => {
      if (i != inter - 1 && e != 0) {
        //e=0说明该接口没连接，所以不用发送
        add_log(`向接口${i + 1}转发消息。`);
        e.write(data); //给除了源地址以外有效的接口转发消息
      }
    });
  }
}

function sw_connection() {
  sflag = 1;
  s.CLIENT = new net.Socket();
  let port = 0;
  if (s.ID == 1) port = input[1];
  else port = input[0];
  s.CLIENT.connect(port, "0.0.0.0", () => {
    let msg = JSON.stringify({
      type: "sw",
      interface: s.SW_CON_INTER,
      content: `交换机${s.ID}连接到本交换机。`,
    });
    console.log(`交换机${s.ID}连接到另一台交换机。`);
    // s.CLIENT.write(`交换机${s.ID}连接到本交换机。`);
    s.CLIENT.write(msg);
    board.$notify.success({
      title: "系统消息",
      showClose: true,
      message: `与另一台交换机连接成功！`,
      position: "bottom-left",
    });
  });
  s.CLIENT.on("data", (data) => {
    let msg = JSON.parse(data);
    console.log(
      `交换机${s.ID}收到另一台交换机的数据：` + msg.content
    );
    if (msg.type == "welcome") {
      board.$notify.success({
        title: "系统消息",
        showClose: true,
        message:
          `交换机${s.ID}收到另一台交换机${msg.from}的数据：` + msg.content,
        position: "bottom-left",
      });
    } else if (msg.type == "data") {
      msg.interface = s.SW_IN_INTER;
      console.log(
        `交换机${s.ID}从接口${s.SW_IN_INTER}收到另一台交换机转发的数据包：${msg.content}`
      ); //模拟的效果上是从IN_INTER转发过来的
      core(msg);
    }
  });
  s.CLIENT.on("error", () => {
    s.CLIENT.destroy();
  });
  s.CLIENT.on("close", () => {
    console.log("另一台交换机断开了与本交换机的连接。");
    board.$notify.info({
      title: "系统消息",
      showClose: true,
      message: "另一台交换机断开了与本交换机的连接。",
      position: "bottom-left",
    });
  });
}

function pool_maintain(c) {
  s.INTERFACE.forEach((e, i) => {
    if (e == c) {
      s.INTERFACE[i] = 0; //将socket对象从连接池删除
      board.$notify.success({
        title: "连接池维护",
        showClose: true,
        message: `${c.remoteAddress}:${c.remotePort}已经从连接池中删除`,
        position: "top-right",
      });
    }
  });
}

function add_log(msg) {
  board.table_log.push({
    content: msg,
  });
  //日志表格收到新消息就滚动到底部
  board.$nextTick(() => {
    let container = board.$el.querySelectorAll(".el-table__body-wrapper");
    // console.log(container[1]);//第二个是table_log 第一个是table_mac
    container[1].scrollTop = container[1].scrollHeight;
  });
}

class Switch {
  ID = 0;
  INTERFACE = [0, 0, 0, 0]; //每个交换机的客户端连接池
  CLIENT = null; //用于交换机互连的client
  SW_CON_INTER = 0; //本交换机client连接到另一台交换机的接口号
  SW_IN_INTER = 0; //另一台交换机client连接到本交换机的接口号
  constructor(IDNUM) {
    this.ID = IDNUM;
    this.sw = new net.createServer((c) => {
      c.setEncoding("utf-8");
      console.log("client CONNECTED: " + c.remoteAddress + ":" + c.remotePort);
      board.$notify.success({
        title: "系统消息",
        showClose: true,
        message: "client CONNECTED: " + c.remoteAddress + ":" + c.remotePort,
        position: "bottom-left",
      });
      c.on("data", (data) => {
        let msg2 = JSON.parse(data);
        this.INTERFACE[msg2.interface - 1] = c;
        if (msg2.type == "connection") {
          console.log(`当前的客户端连接池：${this.INTERFACE}`);
          console.log(
            `来自MAC地址为${msg2.mac}，接口号为${msg2.interface}的客户端已连接本交换机！`
          );
          board.$notify.success({
            title: "系统消息",
            showClose: true,
            message: `来自MAC地址为${msg2.mac}，接口号为${msg2.interface}的客户端已连接本交换机！`,
            position: "bottom-left",
          });
        } else if (msg2.type == "sw") {
          this.SW_IN_INTER = msg2.interface; //记录下另一台交换机client连接到本交换机的接口号
          console.log(`当前的客户端连接池：${this.INTERFACE}`);
          board.$notify.success({
            title: "系统消息",
            showClose: true,
            message: `${msg2.content}`,
            position: "bottom-left",
          });
          //收到另一台交换机的socket客户端连接后，同样做法创建socket客户端连接回去
          if (!sflag) {
            if (!this.SW_CON_INTER) {
              sflag = 1;
              board.dialogVisible = true;
            }
          }
        } else if (msg2.type == "data") {
          core(msg2);//交换机工作核心算法函数
        }
      });
      c.on("close", function () {
        console.log("client CLOSED: " + c.remoteAddress + " " + c.remotePort);
        pool_maintain(c); //维护客户端连接池
        board.$notify.warning({
          title: "系统消息",
          showClose: true,
          message: `客户端${c.remoteAddress}:${c.remotePort}已断开`,
          position: "bottom-left",
        });
      });
      c.on("error", () => {
        pool_maintain(c); //维护客户端连接池
        c.destroy();
      });
      let msg = JSON.stringify({
        type: "welcome",
        from: this.ID,
        content: "Welcome for service!\r\n",
      });
      c.write(msg);
    });
    this.sw.on("error", (err) => {
      console.log(err.stack);
      lflag = 0;
      this.sw.destroy();
    });
    let pin = input[IDNUM - 1];
    this.sw.listen(pin, "0.0.0.0", () => {
      console.log("server" + this.ID + " starts up.");
      console.log("server" + this.ID + " is listening port:" + pin + "...");
      board.$notify.info({
        title: "恭喜",
        showClose: true,
        message: "本服务器" + this.ID + "已启动，正在监听端口:" + pin + "...",
        position: "bottom-left",
      });
    });
  }
}

board = new Vue({
  el: "#board",
  data: {
    options: [
      {
        value: 1,
        label: "Switch-1",
      },
      {
        value: 2,
        label: "Switch-2",
      },
    ],
    value: undefined,
    select_en: false,
    dialogVisible: false,
    sw_con_inter: undefined,
    sw_con_inter_options: [
      {
        value: 1,
        label: "接口1",
      },
      {
        value: 2,
        label: "接口2",
      },
      {
        value: 3,
        label: "接口3",
      },
      {
        value: 4,
        label: "接口4",
      },
    ],
    table_mac: [
    ],
    table_log: [
    ],
  },
  methods: {
    listen() {
      if (!lflag) {
        if (this.value > 0) {
          s = new Switch(this.value);
          lflag = 1;
          this.$notify.success({
            title: "恭喜",
            showClose: true,
            message: `监听端口${input[s.ID - 1]}成功！`,
            position: "bottom-left",
          });
          this.select_en = true;
        } else {
          this.$notify.error({
            title: "错误",
            showClose: true,
            message: "请先选择当前的交换机！",
            position: "bottom-left",
          });
        }
      } else {
        this.$notify.info({
          title: "提示",
          showClose: true,
          message: "已在监听，请勿重复操作。",
          position: "bottom-left",
        });
      }
    },
    close() {
      s.INTERFACE.forEach((e) => {
        if (e != 0) e.end();
      });
      s.INTERFACE = [0, 0, 0, 0];
      console.log(`服务器停止监听后清除连接池:${s.INTERFACE}`);
      s.sw.close((err) => {
        if (err) {
          console.log("close回调：服务端异常：" + err.message);
          this.$notify.error({
            title: "结束",
            showClose: true,
            message: "close回调：服务端异常：" + err.message,
            position: "bottom-left",
          });
        } else {
          console.log("close回调：服务端正常关闭");
          lflag = 0;
          this.$notify.success({
            title: "结束",
            showClose: true,
            message: "Socket服务器已正常关闭，停止监听。",
            position: "bottom-left",
          });
          this.select_en = false;
        }
      });
    },
    sw_con() {
      this.dialogVisible = false;
      if (!s)
        this.$notify.error({
          title: "错误",
          showClose: true,
          message: "请先创建socket再连接交换机！",
          position: "bottom-left",
        });
      else {
        s.SW_CON_INTER = this.sw_con_inter;
        sw_connection();
      }
    },
    clean_table_log(){
      this.table_log=[];
    }
  },
});

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
