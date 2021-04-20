# Switch Simulator

### Computer Networks Socket Experiment

**Clone to see HOW a Switch works to transport information with SELF-STUDY strategy.**

This is an **Electron** application with **Vue & Element-UI** frameworks.

FUNCTIONS *to be implemented*:
- [ ] 主机更换MAC地址
- [ ] 主机和交换机断开连接后各自表项的清理
- [ ] 核心过程用Canvas动画表现（加一个新的渲染窗口和主进程通信控制？暂定）
- [ ] 交换机和主机界面相关按钮在连接前后的禁用状态维护
- [x] 客户端断开连接按钮，断开前维护服务器的连接池（交换机）
- [x] MAC缓存表项的老化时间TTL
- [x] 交换机互连(分别选择接口号创建client连接对方server)
- [x] 交换机互连后转发消息的接口处理

## To Use

To clone and run this repository you'll need [**Git**](https://git-scm.com) and [**Node.js**](https://nodejs.org/en/download/) (which comes with [**npm**](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/Void-7/Switch.git
# Go into your own project directory
cd my-project
# Install dependencies
npm install
# Run the app
npm start
```

Note: If you're using Linux Bash for Windows, [see this guide](https://www.howtogeek.com/261575/how-to-run-graphical-linux-desktop-applications-from-windows-10s-bash-shell/) or use `node` from the command prompt.

## License

[CC0 1.0 (Public Domain)](LICENSE.md)