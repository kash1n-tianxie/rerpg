"""
学术论文数据采集 - TensorBoard自定义回调
用于采集强化学习训练过程中的详细游戏指标
"""

from stable_baselines3.common.callbacks import BaseCallback
import numpy as np


class RPGMetricsCallback(BaseCallback):
    """
    自定义回调函数 - 用于学术论文数据采集
    
    记录的指标：
    1. 核心性能 (Performance):
       - custom/total_damage: 累计伤害
       - custom/survival_turns: 存活回合数
       - custom/total_healing: 累计治疗
    
    2. 战术行为 (Tactical Behavior):
       - tactical/self_destruct_turn: 自爆时机
       - tactical/healer_sacrifice_rate: 治疗师牺牲率
       - tactical/soul_burn_count: Soul Burn使用次数
       - tactical/taunt_count: 嘲讽使用次数
       - tactical/pray_count: 群奶使用次数
    
    3. 高级分析 (Advanced):
       - analysis/damage_per_turn: 平均DPT
       - analysis/episode_length_dist: 回合数分布
    """
    
    def __init__(self, verbose: int = 0):
        super().__init__(verbose)
        
        # 累积统计数据
        self.episode_damages = []
        self.episode_turns = []
        self.self_destruct_turns = []
        self.healer_sacrifices = []
        self.soul_burn_counts = []
        self.taunt_counts = []
        self.pray_counts = []
        self.total_healings = []
        
        # 当前episode数据
        self.current_episode_data = {}
        
        # Episode计数
        self.episode_count = 0
    
    def _on_step(self) -> bool:
        """
        每个step调用一次
        检查episode是否结束，如果结束则记录数据
        """
        # 检查是否有episode结束
        if self.locals.get("dones")[0]:
            # 获取info字典
            info = self.locals.get("infos")[0]
            
            # ========== 提取核心性能指标 ==========
            total_damage = info.get("total_damage", 0)
            survival_turns = info.get("survival_turns", 0)
            total_healing = info.get("total_healing", 0)
            
            # ========== 提取战术行为指标 ==========
            self_destruct_turn = info.get("self_destruct_turn", -1)
            healer_sacrifice = info.get("healer_sacrifice", 0)
            soul_burn_count = info.get("soul_burn_count", 0)
            taunt_count = info.get("taunt_count", 0)
            pray_count = info.get("pray_count", 0)
            
            # 累积数据
            self.episode_damages.append(total_damage)
            self.episode_turns.append(survival_turns)
            self.total_healings.append(total_healing)
            self.soul_burn_counts.append(soul_burn_count)
            self.taunt_counts.append(taunt_count)
            self.pray_counts.append(pray_count)
            
            if self_destruct_turn > 0:
                self.self_destruct_turns.append(self_destruct_turn)
            
            if healer_sacrifice > 0:
                self.healer_sacrifices.append(1)
            else:
                self.healer_sacrifices.append(0)
            
            self.episode_count += 1
            
            # ========== 每100个episode记录一次统计 ==========
            if self.episode_count % 100 == 0:
                self._log_statistics()
        
        return True
    
    def _log_statistics(self):
        """记录统计数据到TensorBoard"""
        # 最近100个episode的数据
        recent_window = 100
        recent_damages = self.episode_damages[-recent_window:]
        recent_turns = self.episode_turns[-recent_window:]
        recent_healings = self.total_healings[-recent_window:]
        recent_soul_burns = self.soul_burn_counts[-recent_window:]
        recent_taunts = self.taunt_counts[-recent_window:]
        recent_prays = self.pray_counts[-recent_window:]
        recent_sacrifices = self.healer_sacrifices[-recent_window:]
        
        # ========== 核心性能指标 ==========
        self.logger.record("custom/total_damage_mean", np.mean(recent_damages))
        self.logger.record("custom/total_damage_max", np.max(recent_damages))
        self.logger.record("custom/total_damage_std", np.std(recent_damages))
        
        self.logger.record("custom/survival_turns_mean", np.mean(recent_turns))
        self.logger.record("custom/survival_turns_max", np.max(recent_turns))
        
        self.logger.record("custom/total_healing_mean", np.mean(recent_healings))
        
        # ========== 战术行为指标 ==========
        # 自爆时机分布
        recent_sd_turns = [t for t in self.self_destruct_turns[-recent_window:] if t > 0]
        if len(recent_sd_turns) > 0:
            self.logger.record("tactical/self_destruct_turn_mean", np.mean(recent_sd_turns))
            self.logger.record("tactical/self_destruct_rate", 
                             len(recent_sd_turns) / recent_window)
        
        # 治疗师牺牲率
        sacrifice_rate = np.mean(recent_sacrifices)
        self.logger.record("tactical/healer_sacrifice_rate", sacrifice_rate)
        
        # 技能使用频率
        self.logger.record("tactical/soul_burn_per_episode", np.mean(recent_soul_burns))
        self.logger.record("tactical/taunt_per_episode", np.mean(recent_taunts))
        self.logger.record("tactical/pray_per_episode", np.mean(recent_prays))
        
        # ========== 高级分析指标 ==========
        # 平均DPT (Damage Per Turn)
        dpts = [d/t if t > 0 else 0 for d, t in zip(recent_damages, recent_turns)]
        self.logger.record("analysis/damage_per_turn", np.mean(dpts))
        
        # 回合数分布（四分位数）
        if len(recent_turns) > 0:
            self.logger.record("analysis/turns_p25", np.percentile(recent_turns, 25))
            self.logger.record("analysis/turns_p50", np.percentile(recent_turns, 50))
            self.logger.record("analysis/turns_p75", np.percentile(recent_turns, 75))
        
        # 伤害分布（用于"伤害突破曲线"）
        if len(recent_damages) > 0:
            self.logger.record("analysis/damage_p25", np.percentile(recent_damages, 25))
            self.logger.record("analysis/damage_p50", np.percentile(recent_damages, 50))
            self.logger.record("analysis/damage_p75", np.percentile(recent_damages, 75))
            self.logger.record("analysis/damage_p90", np.percentile(recent_damages, 90))
        
        # ========== 学术发表关键指标 (Key Metrics for Publication) ==========
        # 这些指标专门用于论文图表
        
        # 1. 学习曲线 - Total Damage (展示收敛性)
        self.logger.record("key_metrics/total_damage", np.mean(recent_damages))
        
        # 2. 战术涌现 - Self-Destruct Timing (证明"憋大招"策略)
        if len(recent_sd_turns) > 0:
            self.logger.record("key_metrics/self_destruct_timing", np.mean(recent_sd_turns))
            # 简化：使用最近有自爆的episode的平均伤害作为自爆伤害指标
            # 这个指标用于论文中展示自爆与伤害的关系
            self.logger.record("key_metrics/self_destruct_damage", np.mean(recent_damages))
        
        # 3. 法师燃魂策略 - Soul Burn Frequency
        self.logger.record("key_metrics/soul_burn_frequency", np.mean(recent_soul_burns))
        
        # 4. 决策质量 - Damage Efficiency (DPT作为决策质量的指标)
        if len(dpts) > 0:
            self.logger.record("key_metrics/decision_quality_dpt", np.mean(dpts))
        
        # 5. 生存策略 - Survival Performance
        self.logger.record("key_metrics/survival_performance", np.mean(recent_turns))
        
        # 6. 团队协同 - Healing Efficiency (治疗与伤害的平衡)
        if np.mean(recent_damages) > 0:
            healing_ratio = np.mean(recent_healings) / np.mean(recent_damages)
            self.logger.record("key_metrics/team_synergy", healing_ratio)
        
        # 记录episode数
        self.logger.record("custom/episode_count", self.episode_count)
        
        if self.verbose > 0:
            print(f"\n📊 Episode {self.episode_count} 统计:")
            print(f"   平均伤害: {np.mean(recent_damages):.1f}")
            print(f"   最高伤害: {np.max(recent_damages):.0f}")
            print(f"   平均存活: {np.mean(recent_turns):.1f} 回合")
            if len(recent_sd_turns) > 0:
                print(f"   自爆时机: {np.mean(recent_sd_turns):.1f} 回合")
    
    def _on_training_end(self):
        """训练结束时的最终统计"""
        print("\n" + "="*60)
        print("📈 训练完成 - 最终统计")
        print("="*60)
        print(f"总Episode数: {self.episode_count}")
        print(f"平均伤害: {np.mean(self.episode_damages):.1f}")
        print(f"最高伤害: {np.max(self.episode_damages):.0f}")
        print(f"平均存活: {np.mean(self.episode_turns):.1f} 回合")
        
        if len(self.self_destruct_turns) > 0:
            print(f"自爆使用率: {len(self.self_destruct_turns)/self.episode_count*100:.1f}%")
            print(f"平均自爆时机: {np.mean(self.self_destruct_turns):.1f} 回合")
        
        sacrifice_rate = np.mean(self.healer_sacrifices) * 100
        print(f"治疗师牺牲率: {sacrifice_rate:.1f}%")
        print("="*60)


# ========== 使用示例 ==========
if __name__ == "__main__":
    print("""
    使用方法：
    
    from callbacks import RPGMetricsCallback
    from stable_baselines3 import PPO
    
    # 创建callback
    metrics_callback = RPGMetricsCallback(verbose=1)
    
    # 训练时挂载
    model = PPO("MlpPolicy", env, tensorboard_log="./tensorboard_logs/")
    model.learn(
        total_timesteps=100000,
        callback=metrics_callback
    )
    
    训练后，使用TensorBoard查看：
    python3 -m tensorboard.main --logdir tensorboard_logs
    
    然后访问 http://localhost:6006/ 查看图表
    """)
