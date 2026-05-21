🌐 **[简体中文](CONTRIBUTING.md)** | **English** | **[日本語](CONTRIBUTING.ja.md)**

---

# 🤝 Open Source Contributing Guidelines (CONTRIBUTING)

Thank you for your interest in our academic project! **rerpg** is an experimental platform designed to compare and evaluate the decision-making behaviors, vulnerability patterns, and cooperative strategies among humans, Reinforcement Learning (RL), and Large Language Models (LLMs) under extreme JRPG resource constraints.

We highly welcome researchers and AI enthusiasts to contribute to:
1. **Testing new decision agents** (e.g., integrating open-source LLMs, experimenting with SAC, Rainbow DQN, etc.).
2. **Extending expert reward systems** in the RL environment.
3. **Sharing human combat trial logs and datasets**.

---

## 🛠️ Experimental Consistency & Red Lines

To preserve the fairness and reproducibility of comparative results, all code or data contributions must adhere to the following red lines:

1. **Rule Set Consistency**:
   * All experimental groups (RL, LLMs, Humans) must utilize the **5000 HP** Boss configuration.
   * Every match has a strict **50-turn limit**.
   * No modification to the combat formulas, action costs, or recovery rates in `rpg_boss_fight_env.py` and `services/BattleEngine.ts` is permitted.

2. **Data Logging Standards**:
   * RL agent training must run for exactly **100,000 steps** (default) and output TensorBoard logs.
   * Model evaluation must span at least **100 independent matches (Episodes)** in deterministic mode to report Mean DPE and DES.

---

## 🚀 How to Contribute

### 1. Reporting Bugs & Exploits
If you discover any logic exploits (e.g., unintended defense invulnerability) or game rule inconsistencies, please open an Issue with:
* **Description**: What is the bug/exploit?
* **Reproduction**: Terminal instructions or web interaction steps.
* **Academic Impact**: Does it affect the theoretical maximum damage ceiling (5037.0)?

### 2. Submitting a New Decision Agent
If you develop a new agent that achieves outstanding DES (Decision Efficiency Score), we encourage you to submit a Pull Request (PR):
1. **Fork the Repository** and create your feature branch:
   ```bash
   git checkout -b feature/your-agent-name
   ```
2. **Integrate Your Agent**:
   * For Python-based RL, keep training scripts in the root directory. Ensure it supports deterministic evaluation via `--eval`.
   * For web-based LLMs, add your strategic prompt in `constants.ts` and add selection routes in `App.tsx`.
3. **Submit DES Evaluation**:
   * Report the mean and standard deviation of DPE and DES over 100 evaluation episodes in the PR description.
4. **Submit PR** for codebase review and alignment checks.

---

## 📊 Academic Citation

All code and assets are licensed under the **MIT License**.
If you utilize our dataset, environment, or DP-proof results in your thesis, papers, or reports, please cite this project using the BibTeX format provided in `README.md`.
