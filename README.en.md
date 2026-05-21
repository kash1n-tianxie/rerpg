🌐 **[简体中文](README.md)** | **English** | **[日本語](README.ja.md)**

---

# 🎮 RPG Boss Fight — AI Collaboration & Tactical Evolution Research Project (rerpg)

> **This undergraduate graduation research project aims to compare and evaluate the decision-making performance, vulnerability patterns, and emergence of collaborative strategies among Large Language Models (LLMs), Reinforcement Learning (RL), and human players in a high-pressure, extremely resource-constrained RPG battle environment.**

---

## 📌 Project Background & Research Value

In real-world critical scenarios such as autonomous vehicle collision avoidance, emergency medical triage, and automated financial crisis trading, AI agents often face **extreme pressure under absolute failure-intolerant conditions and limited resources**. 

This research constructs a 3-vs-1 pixel-art JRPG battle system (where the Boss unleashes a 999-damage instant-death execution skill) as a controllable **"Decision-Making Under Pressure Testing System"** to evaluate different cognitive architectures:

* 🤖 **LLMs (Gemini 2.5)**: Demonstrate strong logical reasoning and strategic verbalization capabilities, but are prone to "arithmetic hallucinations" and "memory decay" under long contexts and complex numerical calculations.
* 🧠 **Reinforcement Learning (PPO)**: Features highly precise action execution at high frequencies, but is vulnerable to "Reward Hacking" under dense reward designs. Under sparse/minimalist rewards, however, it can emerge with surprising global optimal solutions such as "altruistic self-destruction."
* 👤 **Human Players**: Possess exceptional intuitive adaptability and non-linear strategic thinking, but can suffer from attentional drift and operational calculation errors (e.g., miscounting 1 AP) due to psychological pressure under instant-death execution threats.

---

## 📁 Directory Structure

```
rerpg/
├── rpg_boss_fight_env.py   # Gym-based custom RPG battle environment
├── train_rl.py             # RL (Detailed tactical reward mode) training script
├── train_baseline.py       # RL (Baseline minimalist reward mode) training script
├── callbacks.py            # Academic-grade data collection & TensorBoard logger
├── test_env.py             # Environment acceptance test script
├── test_expert_rewards.py  # Expert reward validation script
├── test_exploit_fixes.py   # Exploit/vulnerability check script
├── max_damage_calc.py      # DP solver for absolute maximum damage (Oracle)
├── requirements.txt        # Python dependency list
│
├── App.tsx                 # Frontend (Vite + React) entry with JRPG arena & terminal
├── services/
│   └── geminiService.ts    # Service wrapper for Google Gemini API
│
├── docs/                   # 🎓 Academic & Operational Documentation
│   ├── GAMEPLAY.en.md         # 1. Game Mechanics & Tactics (JRPG Rules)
│   ├── RL_TRAINING.en.md      # 2. Reinforcement Learning Training & Evaluation
│   ├── DEPLOYMENT_GUIDE.en.md # 3. Frontend Web Running & Deployment Guide
│   ├── RESEARCH_GUIDE.en.md   # 4. Graduation Thesis Scientific Experiment Guide
│   └── MAX_DAMAGE_ANALYSIS.en.md # 5. DP-proved Maximum Damage Theoretical Limit
└── README.en.md            # This document
```

---

## 🚀 Quick Start

### 1. Python Reinforcement Learning Environment

#### 1.1 Install Dependencies
We recommend running inside a virtual environment (conda or venv):
```bash
pip install -r requirements.txt
```

#### 1.2 Start Reinforcement Learning Contrastive Training
```bash
# Run Baseline training (minimalist reward, 100k steps)
python3 train_baseline.py --steps 100000 --name PPO_Baseline

# Run Detailed training (expert-guided tactical reward, 100k steps)
python3 train_rl.py --steps 100000 --name PPO_Detailed
```

#### 1.3 Monitor Academic Metrics (TensorBoard)
```bash
python3 -m tensorboard.main --logdir tensorboard_logs --port 6006
# Open http://localhost:6006 in your browser
```

#### 1.4 Replay the Best Agent Episode
```bash
python3 replay_best.py
```

#### 1.5 Calculate the Theoretical Maximum Damage (DP Proof)
```bash
python3 max_damage_calc.py --states 40000 --turns 50
```
* Runs for about 60 seconds and yields the **5037.0 points** absolute physical cumulative damage limit, acting as the Oracle Baseline for evaluating decision efficiency.

---

### 2. Frontend React Web Arena

#### 2.1 Install Node Dependencies
Ensure Node.js (v18+) is installed.
```bash
npm install
```

#### 2.2 Configure Gemini API Key
Create a `.env.local` file in the root directory:
```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key
```
*(Get a free API Key from [Google AI Studio](https://aistudio.google.com/))*

#### 2.3 Run Local Development Server
```bash
npm run dev
# Open http://localhost:3000 in your browser
```
Once started, you can switch between **MANUAL**, **AI AUTO**, and **EVOLUTION** modes.

---

## 📚 Detailed Sub-Documents

Please refer to the following sub-documents in the `docs/` directory for deeper insights:

1. **[Game Mechanics & Tactics (docs/GAMEPLAY.en.md)](docs/GAMEPLAY.en.md)**: Details AP management, the 4-turn Boss cycle, and the defensive Taunt mechanics.
2. **[RL Training & Evaluation (docs/RL_TRAINING.en.md)](docs/RL_TRAINING.en.md)**: Explains hyperparameter settings, custom evaluation indicators, and TensorBoard logging.
3. **[Deployment & Web Setup (docs/DEPLOYMENT_GUIDE.en.md)](docs/DEPLOYMENT_GUIDE.en.md)**: Walkthrough for Vite environment configuration, Gemini API integration, and GitHub Pages deployment.
4. **[Graduation Thesis Research Guide (docs/RESEARCH_GUIDE.en.md)](docs/RESEARCH_GUIDE.en.md)**: Guides you in collecting metrics such as DPE, ST, DPT, HSR, and DES for thesis chart plotting.
5. **[DP-proved Max Damage Analysis (docs/MAX_DAMAGE_ANALYSIS.en.md)](docs/MAX_DAMAGE_ANALYSIS.en.md)**: Contains DP proofs, state constraints, and theoretical optimal tactical spectrum.

---

## 🤝 Collaboration & Academic Citation

### License
This project is licensed under the [MIT License](LICENSE).

### Contributing Guidelines
If you'd like to submit new agents, suggest reward designs, or contribute human trial logs, please read our [Contributing Guide (CONTRIBUTING.en.md)](CONTRIBUTING.en.md).

### Citation
If you use this codebase, experimental data, or methodology in your academic papers or reports, please cite it using the following BibTeX format:

```bibtex
@misc{rerpg2026,
  author       = {kashin},
  title        = {rerpg: An Experimental Platform for Decision-Making Comparison under Extreme JRPG Resource Constraints},
  year         = {2026},
  publisher    = {GitHub},
  journal      = {GitHub Repository},
  howpublished = {\url{https://github.com/your-username/rerpg}}
}
```

---

*2026 Graduation Research Project / Advisor: [Advisor Name] / Researcher: [Your Name]*
