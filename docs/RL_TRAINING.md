🌐 **简体中文** | **[English](RL_TRAINING.en.md)** | **[日本語](RL_TRAINING.ja.md)**

---

# 🧠 强化学习训练与评估指南 (RL_TRAINING)

本指南介绍如何在终端运行该 RPG 战斗环境的强化学习（RL）训练与对比实验。我们使用 Stable-Baselines3 提供的 PPO 算法，对比**简单基准奖励 (Baseline)** 与 **人类启发式战术奖励 (Detailed)** 下智能体的策略表现。

---

## 1. 运行环境配置

本项目的强化学习环境依赖于 Python 3.9+ 版本的环境。

### 安装依赖包
在项目根目录下，执行以下命令安装运行所需要的 Python 库：
```bash
pip install -r requirements.txt
```

> [!TIP]
> 推荐使用 `conda` 或 `venv` 创建独立的虚拟环境进行实验，避免依赖冲突。

---

## 2. 开展对比实验（训练命令）

为了对比不同奖励机制的性能表现，我们需要分别在两种奖励模式下运行训练。

### 实验 1: 训练基准模型 (Baseline)
在 Baseline 模式下，智能体仅能通过“造成伤害”和“存活时间”获得最基础的奖励。这能测试智能体在没有任何战术指导下的自发学习能力。

```bash
python3 train_baseline.py --steps 100000 --name ppo_baseline_100k
```
* `--steps`: 设置训练的物理步数（默认 100k，建议对比实验均统一在 100,000 步）。
* `--name`: 指定输出的 TensorBoard 日志名称。
* 训练好的模型会保存在 `models/baseline_ppo.zip`。

### 实验 2: 训练细化战术模型 (Detailed)
在 Detailed 模式下，加入了人类专家设计的引导奖励（如“凝视期前提前治疗坦克 Arthur”、“处决期 Arthur 成功使用 Taunt”等）。

```bash
python3 train_rl.py --steps 100000 --name ppo_detailed_100k
```
* 训练好的模型会保存在 `models/rpg_boss_ppo.zip`。

---

## 3. 使用 TensorBoard 监控训练过程

本项目集成了自定义的学术数据回调函数 `callbacks.py` (即 `RPGMetricsCallback`)。它会在训练过程中实时导出详细的游戏性能指标。

### 启动 TensorBoard 服务
在项目根目录下，运行以下命令启动日志服务器：
```bash
python3 -m tensorboard.main --logdir tensorboard_logs --port 6006
```
启动后，在浏览器中打开：[http://localhost:6006](http://localhost:6006)

### 核心观察指标说明
在 TensorBoard 界面中，除了基础的 `rollout/ep_rew_mean`（平均单局总奖励）之外，我们专门设计了以下学术指标面板：

| 面板类别 | 指标名称 | 含义 | 学术意义 |
| :--- | :--- | :--- | :--- |
| **custom/** | `custom/total_damage_mean` | 平均单局总伤害 | 评价智能体最核心的输出效率 |
| **custom/** | `custom/survival_turns_mean` | 平均生存回合数 | 评估防御联防的成功率 |
| **tactical/** | `tactical/self_destruct_rate` | Arthur 自爆使用率 | 考察自牺牲机制的自发涌现 |
| **tactical/** | `tactical/taunt_per_episode` | 单局嘲讽技能释放次数 | 监测关键防御机制的掌握度 |
| **key_metrics/**| `key_metrics/team_synergy` | 治疗与伤害比值 | 反映坦克-治疗联防机制的协调度 |

---

## 4. 智能体评估与表现回放

训练完成后，我们可以使用评估模式测试智能体，或者动态重现最完美的对局。

### 评估智能体性能
运行评估模式，在不带有探索随机性的确定性策略（Deterministic Policy）下测试模型的胜率及均值：
```bash
# 评估 Baseline 模型
python3 train_rl.py --eval --model models/baseline_ppo

# 评估 Detailed 模型
python3 train_rl.py --eval --model models/rpg_boss_ppo
```

### 回放最强 Episode (Replay)
项目提供了 `replay_best.py` 脚本，它会加载训练好的模型，在终端以清晰可读的 JRPG 状态面板形式，打印智能体与 Boss 对决的每一轮细节：
```bash
python3 replay_best.py
```
> [!NOTE]
> 该脚本会自动寻找你训练出的最佳模型（默认为 `models/rpg_boss_ppo`）并运行 1 次完整的演示对局，适合用于分析 AI 的微观战术决策流。
