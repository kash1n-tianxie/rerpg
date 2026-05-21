🌐 **[简体中文](DEPLOYMENT_GUIDE.md)** | **English** | **[日本語](DEPLOYMENT_GUIDE.ja.md)**

---

# 🌐 Frontend Web Arena Running & Deployment Guide (DEPLOYMENT_GUIDE)

This project features an interactive, high-fidelity JRPG pixel-art web frontend powered by React, TypeScript, and Vite. Human players can play manually via their browsers, or delegate play to LLM agents by integrating the Gemini API.

---

## 1. Running Locally (Dev Server)

The web client runs on Node.js. Ensure you have Node.js installed (v18+ recommended).

### 1.1 Install Dependencies
Run this in the project root directory:
```bash
npm install
```

### 1.2 Configure Environment Variables (.env)
To enable the Google Gemini agent:
1. Create a file named `.env.local` in the project root:
   ```bash
   touch .env.local
   ```
2. Write your API Key to the file (Vite requires variables to be prefixed with `VITE_`):
   ```env
   VITE_GEMINI_API_KEY=your_google_gemini_api_key
   ```

> [!TIP]
> Get a free API Key from [Google AI Studio](https://aistudio.google.com/). If not configured, the frontend will fall back to local rule-based mock prompts.

### 1.3 Start the Local Development Server
Launch the development server:
```bash
npm run dev
```
By default, the server starts on local port `3000`.
Open [http://localhost:3000](http://localhost:3000) in your browser.

* Note: The configuration is set to `host: '0.0.0.0'` in `vite.config.ts` so other devices in the same LAN can access the test page.

---

## 2. Three Web-Based Experimental Modes

Once in the web arena, you can switch between three modes:

### 👤 MANUAL Mode
* **Target**: Human players.
* **Gameplay**: In each turn, select skills for Arthur (Tank), Merlin (Mage), and Ellie (Healer) sequentially, select targets by clicking their portraits, and click `EXECUTE TURN` to execute.
* **Goal**: Collect human performance, error rates, and attention drift data under JRPG instant-death pressure and AP constraints.

### 🤖 AI AUTO Mode (Gen 0 & Gen 5 Agents)
Delegate the game to LLMs. The frontend will invoke Gemini API:
* **Gen 0 Agent**: Uses `GEN0_STRATEGY` from `constants.ts`. An extremely simple prompt without JRPG rules or cycle disclosures. The agent is highly prone to arithmetic hallucinations.
* **Gen 5 Agent**: Uses `GEN5_STRATEGY` from `constants.ts`. Contains highly detailed rules, Boss cycles, and team cooperation instructions. The agent exhibits significant reasoning ability.

### 🧠 EVOLUTION Mode (Tactical Reflection)
* **Gameplay**: Run the Gen 5 Agent. When a match ends in defeat, the tactical analysis terminal opens.
* **Mechanism**: The system sends the last 20 combat lines to `gemini-2.5-pro` for defeat analysis. The model outputs a strict tactical constraint (e.g., `RULE: ARTHUR MUST TAUNT ON TURN 4`).
* **Evolution**: This rule is dynamically appended to the System Instruction for the next match, simulating generation-level tactical evolution.

---

## 3. Production Build & GitHub Pages Deployment

To bundle the frontend for deployment to GitHub Pages for remote human trials:

### 3.1 Build the Production Bundle
```bash
npm run build
```
The static files will be exported to the `dist/` directory.

### 3.2 Deploy to GitHub Pages
We use `gh-pages` for deployment:
1. Install the utility:
   ```bash
   npm install gh-pages --save-dev
   ```
2. Add deployment scripts to `package.json`:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```
3. Run the deployment script:
   ```bash
   npm run deploy
   ```
4. If you encounter sub-route issues, configure `base: '/your-repo-name/'` in `vite.config.ts` to match your GitHub repository name.
