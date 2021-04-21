const net = require("net");
//利用remote引入ipcRenderer和获取当前窗口对象的方法getCurrentWindow，
//关闭/最小化当前窗口需要用到其唯一属性：win.id
const { ipcRenderer } = require('electron');
const { remote } = require('electron');
let win = remote.getCurrentWindow();

let input = [0, 0];
ipcRenderer.send('req_port', win.id);
ipcRenderer.on('get_port', (e, j) => {
  input[0] = j.port1;
  input[1] = j.port2;
  console.log(`${win.id}窗口从主进程获取到端口设置：${input[0]}、${input[1]}`);
});
let board;let x = 0;//当前窗口的客户端

class PC {
  mac = "";
  interface = 0;
  /*  @sid:server id(1/2)
        @inter:interface(1/2/3/4) connected to switch   */
  constructor(mac, sid, inter) {
    if (sid < 1 || sid > 2) throw "[ERROr] wrong server id";
    if (inter < 1 || inter > 4) throw "[ERROr] wrong interface number";
    this.mac = mac;
    this.interface = inter;
    let client = new net.Socket();
    client.connect(input[sid - 1], "0.0.0.0", () => {
      // client.write(this.mac + "|" + this.interface);
      console.log(`客户端连接函数测试输出。`);
      let msg = JSON.stringify({
        type: "connection",
        interface: this.interface,
        mac: this.mac
      });
      client.write(msg);
    });
    client.on("data", (data) => {
      let msg = JSON.parse(data);
      console.log(`客户端${this.mac}收到数据：${msg}`);
      if (msg.type == 'welcome') {
        console.log(`客户端${this.mac}从${msg.from}收到数据：${msg.content}`);
        board.$notify.info({
          title: "系统消息",
          showClose: true,
          message: `客户端${this.mac}从${msg.from}收到数据：${msg.content}`,
          position: "bottom-left",
        })
      }else if(msg.type=='data'){
        //处理数据包的转发和接收
        if(msg.dst==this.mac){
          board.table_msg.push({
            content:`源${msg.src}：${msg.content} | ${msg.date}`
          });
          //消息表格收到新消息就滚动到底部
          board.$nextTick(() => {
            let container = board.$el.querySelector(".el-table__body-wrapper");
            container.scrollTop = container.scrollHeight;
          });
        }else{
          board.$notify.info({
            title: "系统消息",
            showClose: true,
            message: `客户端收到一条目的MAC与本机不同的消息，丢弃。`,
            position: "top-right",
          });
        }
      }
      // console.log(`客户端${this.mac}收到数据：` + data);
    });
    client.on("error", () => {
      board.target_msg_en=true;//发送消息栏禁用
      board.state=true;//状态图标变为!
      client.destroy();
    });
    client.on("close", () => {
      console.log("Server closed");
      board.$notify.info({
        title: "系统消息",
        showClose: true,
        message: `Socket连接已断开！`,
        position: "bottom-left",
      })
      board.target_msg_en=true;//发送消息栏禁用
      board.state=true;//状态图标变为!
      x=0;
    });
    this.sk = client;
  }
}


board = new Vue({
  el: "#board",
  data: {
    table_msg: [
    ]
    ,
    target_msg_en: true,
    target_msg:"",
    target_mac:"",
    cli_msg: "",
    cli_mac: "",
    cli_options: [
      {
        value: 1,
        label: "PC-1",
      },
      {
        value: 2,
        label: "PC-2",
      },
      {
        value: 3,
        label: "PC-3",
      },
      {
        value: 4,
        label: "PC-4",
      },
      {
        value: 5,
        label: "PC-5",
      },
      {
        value: 6,
        label: "PC-6",
      },
    ],
    cli_value: undefined,//主机号(1-6)
    cli_inter: undefined,
    inter_options:[
      {
        value:1,
        label:"接口1"
      },{
        value:2,
        label:"接口2"
      },{
        value:3,
        label:"接口3"
      },{
        value:4,
        label:"接口4",
      }
    ],
    sw_options: [
      {
        value: 1,
        label: "Switch-1",
      },
      {
        value: 2,
        label: "Switch-2",
      },
    ],
    sw_value: undefined,
    state:true,
    edit_mac_popover_en:false,
  },
  methods: {
    con() {
      if (!x) {
        if (this.cli_inter > 0) {
          if (this.sw_value > 0) {
            if (this.cli_mac != "") {
              x = new PC(this.cli_mac, this.sw_value, this.cli_inter);
              this.target_msg_en=false;//发送消息栏解除禁用
              this.state=false;//状态图标变为√
            } else {
              this.$notify.error({
                title: "错误",
                showClose: true,
                message: `请先输入当前主机的MAC地址！`,
                position: "bottom-left",
              });
            }
          } else {
            this.$notify.error({
              title: "错误",
              showClose: true,
              message: `请先选择待连接的交换机！`,
              position: "bottom-left",
            });
          }
        } else {
          this.$notify.error({
            title: "错误",
            showClose: true,
            message: `请先选择当前的主机！`,
            position: "bottom-left",
          });
        }
      } else {
        this.$notify.info({
          title: "提示",
          showClose: true,
          message: `PC${this.cli_value}已连接,请勿重复连接！`,
          position: "bottom-left",
        });
      }
    },
    close(){
      x.sk.destroy();
      this.target_msg_en=true;//发送消息栏禁用
      this.state=true;//状态图标变为!
      x=0;
      this.$notify.info({
        title: "提示",
        showClose: true,
        message: `PC${this.cli_value}已断开连接！`,
        position: "bottom-left",
      });
    },
    send() {
      let msg = JSON.stringify({
        type: "data", //交换机自学习算法过程的常规数据包
        interface: x.interface,
        src: x.mac,
        dst:this.target_mac,
        content:this.target_msg,
        date:new Date().toString()
      });
      x.sk.write(msg);
      this.target_msg='';
    },
    edit_mac(){
      this.edit_mac_popover_en=false;
      if(x){
        x.mac=this.cli_mac;
        this.$notify.success({
          title: "提示",
          showClose: true,
          message: `PC${this.cli_value}的MAC地址已经修改为${x.mac}！`,
          position: "bottom-left",
        });
      }
    }
  },
});

let titlebarHandler = new Vue({
  el: "#titlebar",
  methods: {
    minimize() {
      console.log("clientWindow发送最小化请求到主进程");
      ipcRenderer.send("mini", win.id); //minimize window
    },
    quit() {
      console.log("clientWindow发送关闭请求到主进程");
      ipcRenderer.send("quit", win.id); //close window
    },
  },
});