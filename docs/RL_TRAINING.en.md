🌐 **[简体中文](RL_TRAINING.md)** | **English** | **[日本語](RL_TRAINING.ja.md)**

---

# 🧠 Reinforcement Learning Training & Evaluation Guide (RL_TRAINING)

This guide introduces how to run reinforcement learning (RL) training and contrastive experiments for the RPG battle environment in the terminal. We use the PPO algorithm provided by Stable-Baselines3 to compare the performance of agents under a **Minimalist Reward (Baseline)** versus an **Expert-Guided Tactical Reward (Detailed)**.

---

## 1. Environment Configuration

The RL environment requires Python 3.9+.

### Installing Dependencies
In the root directory of the project, run:
```bash
pip install -r requirements.txt
```

> [!TIP]
> We recommend using `conda` or `venv` to create an isolated virtual environment to avoid dependency conflicts.

---

## 2. Running Contrastive Experiments

To compare different reward designs, run training in both modes:

### Experiment 1: Train the Baseline Agent
In Baseline mode, the agent only receives sparse feedback from "dealing damage" and "survival time." This tests the agent's self-learning ability without any tactical guidance.

```bash
python3 train_baseline.py --steps 100000 --name ppo_baseline_100k
```
* `--steps`: The number of training steps (default 100k, recommended for contrastive runs).
* `--name`: Specifies the TensorBoard log directory name.
* The trained model is saved at `models/baseline_ppo.zip`.

### Experiment 2: Train the Detailed Agent (Tactical Guidance)
Detailed mode includes expert-designed guidance rewards (e.g., "healing Arthur prior to the Gaze turn," "Arthur successfully using Taunt in the Execute turn").

```bash
python3 train_rl.py --steps 100000 --name ppo_detailed_100k
```
* The trained model is saved at `models/rpg_boss_ppo.zip`.

---

## 3. Monitoring via TensorBoard

We integrate a custom callback `callbacks.py` (`RPGMetricsCallback`) to log detailed performance statistics in real time.

### Launching TensorBoard
Run this command in the root directory:
```bash
python3 -m tensorboard.main --logdir tensorboard_logs --port 6006
```
Open [http://localhost:6006](http://localhost:6006) in your browser.

### Key Observation Metrics
Under the TensorBoard panel, you can track the following academic metrics:

| Panel | Metric | Description | Academic Value |
| :--- | :--- | :--- | :--- |
| **custom/** | `custom/total_damage_mean` | Avg cumulative damage per episode | Measures the core output efficiency of the agent. |
| **custom/** | `custom/survival_turns_mean` | Avg survival turns per episode | Evaluates defensive coordination success rate. |
| **tactical/** | `tactical/self_destruct_rate` | Arthur's self-destruct usage rate | Observes the emergence of self-sacrifice strategies. |
| **tactical/** | `tactical/taunt_per_episode` | Taunt usage frequency | Evaluates mastery of the core execute defense mechanic. |
| **key_metrics/**| `key_metrics/team_synergy` | Heal-to-Damage ratio | Reflects the harmony between output and survival pacing. |

---

## 4. Agent Evaluation & Replay

Once training is complete, you can run evaluation in deterministic mode or replay the best episode.

### Evaluate Agent Performance
Evaluate the model in deterministic mode (with zero exploration randomness) to obtain stable metrics:
```bash
# Evaluate the Baseline agent
python3 train_rl.py --eval --model models/baseline_ppo

# Evaluate the Detailed agent
python3 train_rl.py --eval --model models/rpg_boss_ppo
```

### Replay the Best Episode
Use the `replay_best.py` script to load the trained model and print turn-by-turn battle details directly in the terminal:
```bash
python3 replay_best.py
```
> [!NOTE]
> This script automatically loads the best model (`models/rpg_boss_ppo` by default) and runs 1 complete test episode. It is excellent for analyzing micro-level decisions of the AI.
