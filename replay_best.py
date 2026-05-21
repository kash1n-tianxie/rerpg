"""
最佳回合回放脚本 (Best Episode Replay)
用于论文案例分析 - 记录最高伤害局的详细战斗日志

功能：
1. 加载训练好的模型
2. 运行N局游戏
3. 找出伤害最高的那一局
4. 详细打印该局的完整战斗日志
"""

import numpy as np
from stable_baselines3 import PPO
from rpg_boss_fight_env import RPGBossFightEnv
from dataclasses import dataclass
from typing import List, Dict
import json


@dataclass
class TurnLog:
    """单个回合的详细日志"""
    turn: int
    boss_cycle: int
    boss_cycle_name: str
    
    # 回合开始状态
    arthur_hp_start: int
    merlin_hp_start: int
    ellie_hp_start: int
    arthur_ap_start: int
    merlin_ap_start: int
    ellie_ap_start: int
    
    # 动作
    arthur_action: str
    merlin_action: str
    ellie_action: str
    ellie_target: str
    
    # 回合结束状态
    arthur_hp_end: int
    merlin_hp_end: int
    ellie_hp_end: int
    arthur_ap_end: int      # FIXED: 添加行动后AP
    merlin_ap_end: int      # FIXED: 添加行动后AP
    ellie_ap_end: int       # FIXED: 添加行动后AP
    arthur_shield: int
    arthur_taunt: bool
    
    # 伤害和治疗
    damage_dealt: int
    healing_done: int
    boss_damage_info: str  # FIXED: Boss攻击信息（格式化字符串）
    
    # 奖励
    total_reward: float
    expert_reward: float
    
    # 战报
    battle_report: List[str]  # FIXED: 行动战报（按顺序）
    
    # 特殊事件
    events: List[str]


class EpisodeRecorder:
    """Episode记录器 - 捕获完整战斗日志"""
    
    def __init__(self, env: RPGBossFightEnv):
        self.env = env
        self.turn_logs: List[TurnLog] = []
        self.total_damage = 0
        self.total_reward = 0
        
        # 技能映射
        self.ARTHUR_SKILLS = {0: "WAIT", 1: "Shield_Bash", 2: "Taunt", 3: "Self_Destruct"}
        self.MERLIN_SKILLS = {0: "WAIT", 1: "Missile", 2: "Fireball", 3: "Soul_Burn"}
        self.ELLIE_SKILLS = {0: "WAIT", 1: "Heal", 2: "Transfuse", 3: "Pray"}
        self.TARGET_MAP = {0: "None", 1: "Arthur", 2: "Merlin", 3: "Ellie"}
        self.BOSS_CYCLES = {
            0: "Random_Attack", 
            1: "Sweep", 
            2: "Gaze", 
            3: "Execute"
        }
    
    def record_turn(self, action: np.ndarray, state_before, reward: float, info: Dict):
        """记录一个回合（需要行动前状态）"""
        state_after = self.env.state
        
        # FIXED: 使用实际执行的技能，而不是请求的动作
        executed = info.get('executed_skills', {})
        
        # 解析动作（使用实际执行的）
        arthur_skill = executed.get('arthur')
        merlin_skill = executed.get('merlin')
        ellie_skill_name = executed.get('ellie_skill')
        ellie_target_id = executed.get('ellie_target', 0)
        
        # 格式化显示
        arthur_action = "💀 DEAD" if state_before.arthur.is_dead else (arthur_skill or "UNKNOWN")
        merlin_action = "💀 DEAD" if state_before.merlin.is_dead else (merlin_skill or "UNKNOWN")
        
        # Ellie动作
        if state_before.ellie.is_dead:
            ellie_action = "💀 DEAD"
            ellie_target = "None"
        else:
            ellie_target = self.TARGET_MAP.get(ellie_target_id, "None")
            
            if ellie_skill_name in ["WAIT", "WAIT (AP不足)", None]:
                ellie_action = ellie_skill_name or "WAIT"
            elif ellie_skill_name == "Pray":
                ellie_action = "Pray (AoE)"
            else:
                ellie_action = f"{ellie_skill_name} → {ellie_target}"
        
        # 检测特殊事件（基于行动后状态）
        events = []
        
        if not state_before.arthur.is_dead:
            if arthur_action == "Self_Destruct":
                sd_damage = info.get('total_damage', 0) - self.total_damage
                events.append(f"💥 Arthur自爆！造成{sd_damage}伤害")
                
                if state_before.arthur.current_hp < 50:
                    events.append("⭐ 聪明的牺牲！残血自爆")
            
            if state_after.arthur.has_taunt:
                events.append("🛡️ Arthur开启嘲讽")
        
        # 修复：检查merlin_action是否包含Soul_Burn（不是"WAIT (AP不足)"）
        if not state_before.merlin.is_dead and merlin_action == "Soul_Burn":
            events.append("🔥 Merlin燃魂暴击！")
        
        if not state_before.ellie.is_dead:
            ellie_skill_name = self.ELLIE_SKILLS.get(action[3], "WAIT")
            if ellie_skill_name == "Transfuse" and state_after.ellie.current_hp < 60:
                events.append("⚡ Ellie危险输血！")
        
        if state_after.ellie.is_dead and not state_after.arthur.is_dead:
            events.append("💀 Ellie为救Arthur而牺牲")
        
        # 记录expert奖励
        expert_r = info.get('reward_breakdown', {}).get('expert', 0)
        if expert_r > 50:
            events.append(f"⭐ 专家奖励触发: +{expert_r:.0f}")
        elif expert_r < -50:
            events.append(f"⚠️ 惩罚触发: {expert_r:.0f}")
        
        # FIXED: 格式化Boss攻击信息
        boss_attacks = info.get('boss_attack_log', [])
        boss_damage_str = "无攻击"
        if boss_attacks:
            attack_parts = []
            for atk in boss_attacks:
                target = atk['target']
                damage = atk['damage']
                actual = atk['actual_damage']
                shield = atk['shield_absorbed']
                
                if shield > 0:
                    attack_parts.append(f"{target} {damage}伤害 (护盾吸收{shield})")
                else:
                    attack_parts.append(f"{target} {actual}伤害")
            boss_damage_str = ", ".join(attack_parts)
        
        # FIXED: 使用AP恢复后的值作为"行动前AP"（这才是实际可用的AP）
        ap_recovery = info.get('ap_after_recovery', {})
        arthur_ap_before = ap_recovery.get('arthur', state_before.arthur.ap)
        merlin_ap_before = ap_recovery.get('merlin', state_before.merlin.ap)
        ellie_ap_before = ap_recovery.get('ellie', state_before.ellie.ap)
        
        # 创建回合日志
        turn_log = TurnLog(
            turn=state_before.turn,  # 使用行动前的turn
            boss_cycle=state_before.boss_cycle,
            boss_cycle_name=self.BOSS_CYCLES[state_before.boss_cycle],
            
            # 行动前状态（HP使用before，AP使用恢复后的值）
            arthur_hp_start=state_before.arthur.current_hp,
            merlin_hp_start=state_before.merlin.current_hp,
            ellie_hp_start=state_before.ellie.current_hp,
            arthur_ap_start=arthur_ap_before,
            merlin_ap_start=merlin_ap_before,
            ellie_ap_start=ellie_ap_before,
            
            # 动作
            arthur_action=arthur_action,
            merlin_action=merlin_action,
            ellie_action=ellie_action,
            ellie_target=ellie_target,
            
            # 行动后状态
            arthur_hp_end=state_after.arthur.current_hp,
            merlin_hp_end=state_after.merlin.current_hp,
            ellie_hp_end=state_after.ellie.current_hp,
            arthur_ap_end=state_after.arthur.ap,  # FIXED: 保存行动后AP
            merlin_ap_end=state_after.merlin.ap,  # FIXED: 保存行动后AP
            ellie_ap_end=state_after.ellie.ap,    # FIXED: 保存行动后AP
            arthur_shield=state_after.arthur.shield,
            arthur_taunt=state_after.arthur.has_taunt,
            
            # 数据
            damage_dealt=info.get('total_damage', 0),
            healing_done=info.get('total_healing', 0),
            boss_damage_info=boss_damage_str,  # FIXED: Boss攻击信息
            total_reward=reward,
            expert_reward=expert_r,
            
            # FIXED: 战报（从info获取）
            battle_report=info.get('action_report', []),
            
            events=events
        )
        
        self.turn_logs.append(turn_log)
        self.total_damage = info.get('total_damage', 0)
        self.total_reward += reward
    
    def print_replay(self):
        """打印完整回放"""
        print("\n" + "="*80)
        print(f"🎬 最佳回合回放 - 总伤害: {self.total_damage}")
        print("="*80)
        
        for log in self.turn_logs:
            print(f"\n{'─'*80}")
            print(f"📍 Turn {log.turn} | Boss: {log.boss_cycle_name} (Cycle {log.boss_cycle})")
            print(f"{'─'*80}")
            
            # 行动前角色状态
            print("\n【行动前角色状态】")
            arthur_status_before = "💀 DEAD" if log.arthur_hp_start == 0 else f"{log.arthur_hp_start}/450 HP"
            merlin_status_before = "💀 DEAD" if log.merlin_hp_start == 0 else f"{log.merlin_hp_start}/200 HP"
            ellie_status_before = "💀 DEAD" if log.ellie_hp_start == 0 else f"{log.ellie_hp_start}/250 HP"
            
            print(f"  Arthur (Tank):   {arthur_status_before:20} | AP: {log.arthur_ap_start}")
            print(f"  Merlin (Mage):   {merlin_status_before:20} | AP: {log.merlin_ap_start}")
            print(f"  Ellie  (Healer): {ellie_status_before:20} | AP: {log.ellie_ap_start}")
            
            # 行动选择
            print("\n【行动选择】")
            print(f"  Arthur: {log.arthur_action}")
            print(f"  Merlin: {log.merlin_action}")
            print(f"  Ellie:  {log.ellie_action}")
            
            # FIXED: 战报（按行动顺序：Arthur → Merlin → Boss → Ellie）
            if hasattr(log, 'battle_report') and log.battle_report:
                print(f"\n【战报】")
                for report_line in log.battle_report:
                    print(f"  • {report_line}")
            
            # 战果
            print(f"\n【战果】")
            print(f"  累计伤害: {log.damage_dealt}")
            print(f"  累计治疗: {log.healing_done}")
            print(f"  Boss攻击: {log.boss_damage_info}")  # FIXED: 显示Boss攻击信息
            print(f"  本回合奖励: {log.total_reward:+.1f}")
            if log.expert_reward != 0:
                print(f"  专家奖励: {log.expert_reward:+.1f}")
            
            # 行动后角色状态
            print(f"\n【行动后角色状态】")
            arthur_status_after = "💀 DEAD" if log.arthur_hp_end == 0 else f"{log.arthur_hp_end}/450 HP"
            merlin_status_after = "💀 DEAD" if log.merlin_hp_end == 0 else f"{log.merlin_hp_end}/200 HP"
            ellie_status_after = "💀 DEAD" if log.ellie_hp_end == 0 else f"{log.ellie_hp_end}/250 HP"
            
            shield_str = f" [🛡️ {log.arthur_shield}]" if log.arthur_shield > 0 else ""
            taunt_str = " [TAUNT]" if log.arthur_taunt else ""
            
            # FIXED: 添加行动后AP显示
            arthur_ap_str = "" if log.arthur_hp_end == 0 else f" | AP: {log.arthur_ap_end}"
            merlin_ap_str = "" if log.merlin_hp_end == 0 else f" | AP: {log.merlin_ap_end}"
            ellie_ap_str = "" if log.ellie_hp_end == 0 else f" | AP: {log.ellie_ap_end}"
            
            print(f"  Arthur (Tank):   {arthur_status_after:20}{arthur_ap_str}{shield_str}{taunt_str}")
            print(f"  Merlin (Mage):   {merlin_status_after:20}{merlin_ap_str}")
            print(f"  Ellie  (Healer): {ellie_status_after:20}{ellie_ap_str}")
            
            # 特殊事件
            if log.events:
                print(f"\n【特殊事件】")
                for event in log.events:
                    print(f"  • {event}")
        
        print("\n" + "="*80)
        print(f"🏆 Episode结束")
        print(f"   最终伤害: {self.total_damage}")
        print(f"   存活回合: {len(self.turn_logs)}")
        print(f"   总奖励: {self.total_reward:.1f}")
        print("="*80 + "\n")
    
    def save_to_json(self, filename: str):
        """保存为JSON文件"""
        data = {
            "total_damage": self.total_damage,
            "total_reward": self.total_reward,
            "turns": len(self.turn_logs),
            "logs": [vars(log) for log in self.turn_logs]
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 回放已保存到: {filename}")


def find_best_episode(model_path: str, num_episodes: int = 100):
    """
    运行N局游戏，找出最佳表现
    
    参数:
        model_path: 模型路径
        num_episodes: 运行局数
    
    返回:
        最佳episode的录像
    """
    print("\n" + "="*80)
    print(f"🔍 寻找最佳回合 (共{num_episodes}局)")
    print("="*80)
    
    # 加载模型
    print(f"\n📂 加载模型: {model_path}")
    model = PPO.load(model_path)
    
    # 创建环境
    env = RPGBossFightEnv()
    
    best_damage = 0
    best_recorder = None
    all_damages = []
    
    # 运行多局
    for episode in range(num_episodes):
        recorder = EpisodeRecorder(env)
        obs, info = env.reset()
        done = False
        
        while not done:
            # 保存行动前状态（深拷贝）
            import copy
            state_before = copy.deepcopy(env.state)
            
            # 使用模型预测（确定性）
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            
            # 记录回合（传入行动前状态）
            recorder.record_turn(action, state_before, reward, info)
        
        damage = recorder.total_damage
        all_damages.append(damage)
        
        # 更新最佳
        if damage > best_damage:
            best_damage = damage
            best_recorder = recorder
            print(f"🎯 新纪录! Episode {episode+1}: {damage} 伤害")
        
        # 进度报告
        if (episode + 1) % 20 == 0:
            avg = np.mean(all_damages)
            print(f"进度: {episode+1}/{num_episodes} | 平均: {avg:.0f} | 最高: {best_damage}")
    
    # 统计
    print("\n" + "="*80)
    print("📊 统计结果")
    print("="*80)
    print(f"运行局数: {num_episodes}")
    print(f"平均伤害: {np.mean(all_damages):.1f}")
    print(f"最高伤害: {np.max(all_damages)}")
    print(f"最低伤害: {np.min(all_damages)}")
    print(f"标准差: {np.std(all_damages):.1f}")
    print("="*80)
    
    return best_recorder


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="回放最佳Episode")
    parser.add_argument("--model", type=str, default="models/rpg_boss_ppo", 
                      help="模型路径")
    parser.add_argument("--episodes", type=int, default=100, 
                      help="运行局数")
    parser.add_argument("--save", type=str, default=None, 
                      help="保存JSON路径 (可选)")
    
    args = parser.parse_args()
    
    # 查找最佳episode
    best_recorder = find_best_episode(args.model, args.episodes)
    
    # 打印详细回放
    best_recorder.print_replay()
    
    # 保存（如果指定）
    if args.save:
        best_recorder.save_to_json(args.save)
    
    print("\n💡 提示:")
    print(f"  - 重新运行: python3 replay_best.py --episodes 200")
    print(f"  - 保存JSON: python3 replay_best.py --save best_episode.json")
