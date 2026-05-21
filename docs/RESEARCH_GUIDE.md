🌐 **简体中文** | **[English](RESEARCH_GUIDE.en.md)** | **[日本語](RESEARCH_GUIDE.ja.md)**

---

# 🔬 毕业论文科研实验指南 (RESEARCH_GUIDE)

本研究致力于对比**大语言模型 (LLM)**、**强化学习 (RL)** 与 **人类玩家 (Human)** 在极度苛刻、容错率低的RPG战斗环境中的决策表现，探究不同知能系统在“高压力”和“资源受限”下的决策特性、破绽模式与协同表现。

本指南为未来的实验设计、数据采集及论文撰写提供统一的科研框架。

---

## 1. 核心科研问题与假说

本研究的设立基于以下三个主要科研假说：

1. **假说一：LLM 存在“高压幻觉与记忆衰退”**  
   在低压环境下，LLM 能够进行完美的逻辑推导。但在面对需要严格状态追踪（记住 Boss 行动 Cycle）和精确数值计算（AP 剩余点数与技能消耗）的高压任务时，随着上下文（战斗日志）的增长，LLM 将由于**算术幻觉**和**记忆丧失**导致决策迅速破产。
   
2. **假说二：强化学习存在“奖励哈ッキング (Reward Hacking)”与“过拟合引导的劣化”**  
   在详尽的专家奖励引导下（Detailed 模式），智能体往往会寻找奖励公式的漏洞（例如为了避免失败的惩罚，宁可自杀来提早结束单局）。相反，极简奖励（Baseline 模式）反而更容易促使智能体涌现出更高维度的合作策略（如在完美的血线临界点进行自爆）。

3. **假说三：人类决策受“心理压力”干扰导致非理性注意偏移**  
   人类玩家具有极强的直觉适应能力，能够应对随机的突发状况。然而，在 Execute（即死处决）的时空压迫下，人类极易因为心理焦躁而产生计算失误（如漏算 1 AP），或者由于“防御本能”过度偏向治疗，从而丧失了最佳的输出窗口。

---

## 2. 实验设计与评估指标 (Metrics)

为了提供具有说服力的学术图表，实验设计应包含以下三个主体的对比，并收集以下定量指标。

### 2.1 定量评估指标列表

在开展对比实验时，对于每一组模型或人类测试，需运行至少 **100 次完整的对局（Episode）**，并记录以下指标的统计分布（均值、标准差、最大值、四分位数）：

| 学术分类 | 论文英文指标 | 中文指标说明 | 计算方式 | 科研意义 |
| :--- | :--- | :--- | :--- | :--- |
| **性能效率** | **Damage Per Episode (DPE)** | 单局总伤害量 | $\sum \text{Damage}$ | 衡量消灭 Boss 的最终进展度。 |
| **生存能力** | **Survival Turns (ST)** | 存活回合数 | 单局游戏结束时的 Turn 计数 | 反应智能体应对即死斩杀机制的防守能力。 |
| **决策质量** | **Damage Per Turn (DPT)** | 平均每回合伤害 | $\text{DPE} / \text{ST}$ | 反应智能体在生存与输出之间的资源分配效率。 |
| **协同策略** | **Healer Sacrifice Rate (HSR)** | 治疗师牺牲率 | 治疗师死亡但坦克存活的局数占比 | 考察智能体是否理解“自我牺牲以保留主输出”的利他协同。 |
| **战术分布** | **Self-Destruct Timing (SDT)** | 坦克自爆时机 | 触发自爆时的 Boss 剩余血量百分比 | 评估智能体是否找到了自爆伤害最大化的临界点。 |
| **系统协同** | **Healing Efficiency Ratio (HER)** | 治疗-伤害协调指数 | $\text{Total Healing} / \text{Total Damage}$ | 指数越均衡说明生存与输出的节奏把控越好。 |

### 2.2 Oracle Baseline (先知上限基准) 与决策效率评估

为了科学评估不同智能系统的决策效率，我们引入基于全局动态规划 (DP) 求解器证明的**理论最高累计伤害上限 $D_{\text{oracle}} = 5037.0$ 点**作为 **Oracle Baseline**。

在论文撰写和实验结果整理中，各实验组别应增加**决策效率得分 (Decision Efficiency Score, DES)** 指标的对比计算：

$$\text{DES} = \frac{\text{Mean DPE}}{\text{DP Oracle Max Damage (5037.0)}} \times 100\%$$

> [!NOTE]
> **学术意义**：由于实际游戏中的 Cycle 0 和 Cycle 3 存在攻击目标随机性，任何决策主体在不拥有“未来视”的前提下，均需要采用防守策略以对抗不确定性。主体的平均累计伤害（Mean DPE）与 DP Oracle (5037.0点) 之间的差距，恰好定量地反应了**「主体为了保障生存而不得不付出的“策略机会成本”」**。

---

## 3. 对比实验执行步骤

### 第一步：清空旧数据
在开始前，必须运行以下命令清空已保存的所有旧数据，以确保数据的干净和可复现：
```bash
# 清理以前产生的日志和缓存模型
rm -rf models/* tensorboard_logs/* test_tensorboard/*
```

### 第二步：运行强化学习对比训练
1. **训练 Baseline 模型**（100,000 步）：
   ```bash
   python3 train_baseline.py --steps 100000 --name PPO_Baseline
   ```
2. **训练 Detailed 战术引导模型**（100,000 步）：
   ```bash
   python3 train_rl.py --steps 100000 --name PPO_Detailed
   ```
3. 在训练过程中，通过 TensorBoard ([http://localhost:6006](http://localhost:6006)) 查看 `custom/total_damage_mean` 和 `custom/survival_turns_mean` 两条曲线的收敛速度和高度。

### 第三步：收集评估数据
使用训练好的模型各进行 100 轮评估测试，并将输出的评估指标整理成表格：
```bash
# 评估 Baseline
python3 train_rl.py --eval --model models/baseline_ppo
# 评估 Detailed
python3 train_rl.py --eval --model models/rpg_boss_ppo
```

### 第四步：收集 LLM 与人类测试数据
1. **Gemini 自动测试**：启动网页端，分别使用 `Gen 0` 和 `Gen 5` 的决策模式自动运行 50 局游戏。记录最终的历史胜率曲线和平均伤害。
2. **人类测试**：邀请 5 - 10 位有游戏经验的测试人员进行游玩（可通过部署到 GitHub Pages 的网页），每人游玩 10 局，并导出网页端的“胜率统计 (STATS)”数据。

---

## 4. 论文写作建议与图表规划

在撰写毕业论文时，建议规划以下图表以直观呈现研究发现：

1. **图一：学习收敛曲线 (Learning Curves)**  
   * **横轴**：Training Steps (0 - 100k)  
   * **纵轴**：Episodic Reward / Mean Damage  
   * **内容**：对比 PPO_Baseline 与 PPO_Detailed。通常会观察到 Baseline 的收敛速度虽然较慢，但其最终达到的最高伤害会超越 Detailed。
   
2. **图二：决策崩坏雷达图 (Vulnerability Patterns)**  
   * 绘制雷达图，对比三者在以下几个维度的得分：计算抗压力（数值幻觉率）、记忆广度（Cycle错位率）、心理焦躁度（无 AP 违规操作占比）、极限协调（完美 Taunt 拦截率）。
   
3. **图三：自爆涌现机制分析 (Emergence of Self-Destruct)**  
   * 绘制散点图，横轴为自爆触发时的 Turn，纵轴为自爆造成的 Damage。分析 RL Baseline 是如何在不被人类告知规则的情况下，自发在第 30 回合以后、Boss 处于极低 HP 时触发自爆的，这属于典型的“博弈策略涌现”。
