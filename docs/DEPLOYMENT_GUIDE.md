🌐 **简体中文** | **[English](DEPLOYMENT_GUIDE.en.md)** | **[日本語](DEPLOYMENT_GUIDE.ja.md)**

---

# 🌐 网页端运行与部署指南 (DEPLOYMENT_GUIDE)

本项目包含一个基于 React + TypeScript + Vite 打造的精美 JRPG 像素风前端网页。真人玩家可以通过浏览器手动游玩，也可以通过对接 Gemini API 让 LLM 智能体自动游玩。

---

## 1. 本地运行 (Dev Server)

网页端基于 Node.js 运行，请确保本地已安装 Node.js (推荐 v18+)。

### 1.1 安装依赖
在项目根目录下，执行 npm 包安装命令：
```bash
npm install
```

### 1.2 配置本地环境变量 (.env)
为了能使用 Google Gemini 大语言模型，你需要在本地配置你的 Gemini API Key。
1. 在项目根目录下，创建一个名为 `.env.local` 的文件：
   ```bash
   touch .env.local
   ```
2. 在该文件中写入你的 API Key（注意 Vite 要求前缀为 `VITE_`）：
   ```env
   VITE_GEMINI_API_KEY=你的Google_Gemini_API_Key
   ```

> [!TIP]
> 可以在 [Google AI Studio](https://aistudio.google.com/) 免费申请 Gemini API Key。如果不配置 API Key，前端仍可正常启动，但 AI 自动游玩和战败分析功能将退化为本地 Fallback 提示。

### 1.3 启动本地开发服务
在终端运行开发服务器启动命令：
```bash
npm run dev
```
运行成功后，服务默认会在本地端口 `3000` 启动。
在浏览器中访问：[http://localhost:3000](http://localhost:3000)

* 注：端口配置定义在根目录的 `vite.config.ts` 中，已设为 `host: '0.0.0.0'`，以便局域网内其他设备或虚拟机也可以访问测试。

---

## 2. 网页端的三种游玩/实验模式

进入游戏页面后，你可以在菜单界面或顶部栏中切换不同的操作模式：

### 👤 手动模式 (MANUAL)
* **适合对象**：人类玩家。
* **玩法**：每个回合，依次为 Arthur（坦克）、Merlin（法师）、Ellie（治疗师）点击选择释放的技能，并点击特定队友或敌人的头像作为目标，最后点击 `EXECUTE TURN` 执行该回合。
* **主要目的**：收集人类玩家在高压 Execute 惩罚和 AP 限制下的决策数据与错误率。

### 🤖 LLM 自动模式 (AI AUTO - Gen 0 & Gen 5)
点击 `AI AUTO` 托管对局。该模式下前端将自动调用 Gemini 接口：
* **初级 AI (Gen 0)**：使用 `constants.ts` 中的 `GEN0_STRATEGY`。提示词极度简单，不告知 Boss 行动循环与血量限制。智能体会发生算术幻觉，胡乱出牌。
* **大师 AI (Gen 5)**：使用 `constants.ts` 中的 `GEN5_STRATEGY`。提示词详细说明了 4回合 Boss 循环和各角色的战略配合要求。智能体展现出了一定的逻辑推理能力。

### 🧠 战术反思与进化 (EVOLUTION)
* **玩法**：运行大师 AI 模式，在战斗失败后，战术分析终端会自动弹出。
* **机制**：前端会把最近 20 行战斗日志发送给 `gemini-2.5-pro`，LLM 会进行 defeat analysis（战败分析），并输出一条严格的战术红线（例如：`RULE: ARTHUR MUST TAUNT ON TURN 4`）。
* **进化**：该规则将被动态拼接到下一次对战的 System Instruction 中，使 AI 的决策进行“世代自我净化与迭代”。

---

## 3. 生产打包与 GitHub Pages 部署

如果你想将本系统打包并发布到 GitHub Pages 供他人体验或进行真人实验数据收集，可以使用以下流程：

### 3.1 生产环境构建
```bash
npm run build
```
打包成功后，静态文件会输出到根目录下的 `dist/` 文件夹中。

### 3.2 部署到 GitHub Pages
你可以使用 `gh-pages` 工具快速部署：
1. 安装工具：
   ```bash
   npm install gh-pages --save-dev
   ```
2. 在 `package.json` 中添加部署脚本：
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
3. 在终端运行：
   ```bash
   npm run deploy
   ```
4. 如果有自定义域名或子路由问题，请在 `vite.config.ts` 中根据 GitHub 仓库名称配置 `base: '/你的仓库名/'`。
