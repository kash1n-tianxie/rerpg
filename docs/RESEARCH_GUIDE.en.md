🌐 **[简体中文](RESEARCH_GUIDE.md)** | **English** | **[日本語](RESEARCH_GUIDE.ja.md)**

---

# 🔬 Graduation Thesis Scientific Experiment Guide (RESEARCH_GUIDE)

This research compares the decision-making performance of **Large Language Models (LLMs)**, **Reinforcement Learning (RL)**, and **Human Players (Human)** in an extremely harsh, low-tolerance RPG battle environment. It explores the cognitive traits, vulnerability patterns, and tactical coordination of different intelligence systems under high pressure and resource constraints.

This guide provides a standardized academic framework for experimental design, data collection, and thesis writing.

---

## 1. Core Scientific Questions & Hypotheses

This study is based on three core research hypotheses:

1. **Hypothesis 1: High-Pressure Hallucination & Memory Decay in LLMs**  
   While LLMs perform well in low-pressure logical reasoning, they are prone to **arithmetic hallucinations** and **memory decay** under high-pressure scenarios that require strict state-tracking (tracking the Boss cycle) and precise calculation (monitoring remaining AP). As context (battle logs) increases, their decision accuracy rapidly decays.

2. **Hypothesis 2: Reward Hacking vs. Sparse Exploration in RL**  
   Under highly detailed expert rewards (Detailed mode), the RL agent tends to exploit design loopholes (e.g., self-destructing prematurely to avoid defeat penalties). Conversely, minimalist rewards (Baseline mode) encourage the agent to discover high-level emergent cooperation strategies, such as self-destructing at the absolute optimal health threshold.

3. **Hypothesis 3: Attention Shift induced by Cognitive Stress in Humans**  
   Human players possess strong intuitive adaptability but can suffer from calculation errors (e.g., miscounting 1 AP) under instant-death execution pressure. Additionally, fear-induced defensive instincts can lead humans to over-heal, losing critical offensive windows.

---

## 2. Experimental Design & Metrics

To provide academically convincing charts, experiments should compare all three subjects across 100 independent matches (Episodes) each and record the following metrics:

### 2.1 Quantitative Metrics List

| Class | Academic Metric | Description | Calculation | Academic Significance |
| :--- | :--- | :--- | :--- | :--- |
| **Performance** | **Damage Per Episode (DPE)** | Cumulative damage dealt per episode | $\sum \text{Damage}$ | Measures overall offensive progress against the Boss. |
| **Survival** | **Survival Turns (ST)** | Number of turns survived | End turn count | Evaluates defensive coordination success under instant-death cycle. |
| **Quality** | **Damage Per Turn (DPT)** | Avg damage per turn | $\text{DPE} / \text{ST}$ | Reflects resource allocation efficiency between defense and offense. |
| **Cooperation** | **Healer Sacrifice Rate (HSR)** | Ratio of healer death with tank surviving | Count of matches where Ellie dies but Arthur lives | Evaluates the emergence of altruistic/sacrifice cooperation. |
| **Tactics** | **Self-Destruct Timing (SDT)** | Boss HP percentage at self-destruct | Boss HP % at Arthur self-destruct | Measures whether Arthur identifies the optimal threshold for self-destruct. |
| **Harmony** | **Healing Efficiency Ratio (HER)** | Pacing indicator | $\text{Total Healing} / \text{Total Damage}$ | Measures the balance between healing and damaging tempos. |

### 2.2 Oracle Baseline & Decision Efficiency Score (DES)

To evaluate the decision-making efficiency of different systems under uncertainty, we introduce the **theoretical maximum cumulative damage of 5037.0 points** (proved by the global DP solver) as the **Oracle Baseline**.

In your thesis, calculate the **Decision Efficiency Score (DES)** for each group:

$$\text{DES} = \frac{\text{Mean DPE}}{\text{DP Oracle Max Damage (5037.0)}} \times 100\%$$

> [!NOTE]
> **Academic Context**: Because Cycle 0 and Cycle 3 attacks involve random target selection, agents must make defensive trade-offs to ensure survival. The gap between the actual Mean DPE and the DP Oracle (5037.0) reflects the **"strategic opportunity cost of uncertainty."**

---

## 3. Step-by-Step Experiment Execution

### Step 1: Clean Old Data
Run this command to clear any old training logs and cache files:
```bash
rm -rf models/* tensorboard_logs/* test_tensorboard/*
```

### Step 2: Run RL Contrastive Training
1. **Train the Baseline Model** (100,000 steps):
   ```bash
   python3 train_baseline.py --steps 100000 --name PPO_Baseline
   ```
2. **Train the Detailed Model** (100,000 steps):
   ```bash
   python3 train_rl.py --steps 100000 --name PPO_Detailed
   ```
3. Open TensorBoard ([http://localhost:6006](http://localhost:6006)) to monitor the convergence rate of `custom/total_damage_mean` and `custom/survival_turns_mean`.

### Step 3: Collect Evaluation Metrics
Evaluate each trained model for 100 episodes:
```bash
# Evaluate Baseline
python3 train_rl.py --eval --model models/baseline_ppo

# Evaluate Detailed
python3 train_rl.py --eval --model models/rpg_boss_ppo
```

### Step 4: Collect LLM and Human Data
1. **Gemini Agent**: Run 50 auto matches on the web frontend using Gen 0 and Gen 5 prompts respectively. Record the DPE and survival metrics.
2. **Human Trials**: Invite 5–10 game-literate players to play 10 matches each via the web interface. Export the "STATS" panel data.

---

## 4. Thesis Writing & Chart Recommendations

We recommend planning the following charts in your thesis:

1. **Learning Curve Chart (PPO_Baseline vs. PPO_Detailed)**  
   * **X-axis**: Training Steps (0–100k)  
   * **Y-axis**: Episodic Reward / Mean Damage  
   * Focus on whether the Baseline agent converges slower but eventually surpasses the Detailed agent.

2. **Vulnerability Radar Chart (Human vs. LLM vs. RL)**  
   * Map five dimensions: numerical stress tolerance, memory context retention, execution consistency, compliance with action bounds, and tactical defense interception rate.

3. **Emergence Analysis of Self-Destruct (SDT Scatter Plot)**  
   * Plot Arthur's self-destruct timing (X-axis: Turn, Y-axis: Damage). Analyze how PPO Baseline discovers the "自爆 (Self-Destruct)" peak timing at late stages without any hardcoded rules.
