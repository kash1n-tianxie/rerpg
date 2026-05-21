"""
RPG Boss Fight Environment for Reinforcement Learning
基于 Gymnasium 的自定义环境 - 用于研究"复杂机制下的策略涌现"

核心特性：
1. 固定的BOSS循环机制（4回合）
2. 严格的行动顺序和AP管理
3. 高级观测空间（包含未来预判）
4. 奖励塑造（战术惩罚、延迟奖励）
"""

import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Dict, Tuple, List, Optional
from dataclasses import dataclass, field


@dataclass
class Character:
    """角色数据类"""
    id: str
    name: str
    max_hp: int
    current_hp: int
    ap: int
    shield: int = 0
    is_dead: bool = False
    is_gazed: bool = False  # 被BOSS凝视标记
    has_taunt: bool = False  # 嘲讽状态


@dataclass
class GameState:
    """游戏状态"""
    turn: int = 1
    boss_cycle: int = 0  # 0-3 循环
    total_damage_dealt: int = 0
    total_healing_done: int = 0
    arthur: Character = None
    merlin: Character = None
    ellie: Character = None
    
    # 用于延迟奖励
    ellie_transfused_last_turn: bool = False
    arthur_hp_before_boss: int = 0


class RPGBossFightEnv(gym.Env):
    """
    RPG Boss战斗环境
    
    **游戏机制**：
    - 行动顺序: Arthur -> Merlin -> BOSS -> Ellie
    - AP系统: 每回合开始 AP<3 则 +1，上限3
    - BOSS循环: 0(随机60) -> 1(横扫40) -> 2(凝视标记) -> 3(处决999)
    - 护盾机制: 每回合结束清零
    
    **观测空间** (维度: 25):
    - Boss Cycle One-Hot [4]
    - Arthur状态 [6]: HP%, AP, Shield, Taunt, Dead, Gazed
    - Merlin状态 [4]: HP%, AP, Dead, Gazed
    - Ellie状态 [4]: HP%, AP, Dead, Gazed
    - 全局状态 [4]: Turn, Total_Damage, Safety_Margin, Next_Turn_Damage
    - AP可用性 [3]: Arthur_can_taunt, Merlin_can_burn, Ellie_can_heal
    
    **动作空间** (MultiDiscrete):
    - Arthur动作 [4]: WAIT(0), Shield_Bash(1), Taunt(2), Self_Destruct(3)
    - Merlin动作 [4]: WAIT(0), Missile(1), Fireball(2), Soul_Burn(3)
    - Ellie目标 [4]: WAIT(0), Arthur(1), Merlin(2), Ellie(3)
    - Ellie技能 [4]: WAIT(0), Heal(1), Transfuse(2), Pray(3)
    """
    
    metadata = {"render_modes": ["human"], "render_fps": 1}
    
    # 游戏常量
    BOSS_MAX_HP = 5000  # 统一Boss HP为5000
    MAX_TURNS = 50  # 最大回合数
    
    # BOSS循环机制
    BOSS_PATTERNS = {
        0: {"name": "Random_Attack", "damage": 60, "type": "single"},
        1: {"name": "Sweep", "damage": 40, "type": "aoe"},
        2: {"name": "Gaze", "damage": 0, "type": "mark"},
        3: {"name": "Execute", "damage": 999, "type": "execute"}
    }
    
    # 技能定义
    ARTHUR_SKILLS = {
        0: {"name": "WAIT", "ap_cost": 0},
        1: {"name": "Shield_Bash", "ap_cost": 1, "damage": 20, "shield": 30},
        2: {"name": "Taunt", "ap_cost": 2},
        3: {"name": "Self_Destruct", "ap_cost": 0}
    }
    
    MERLIN_SKILLS = {
        0: {"name": "WAIT", "ap_cost": 0},
        1: {"name": "Missile", "ap_cost": 1, "damage": 60},
        2: {"name": "Fireball", "ap_cost": 2, "damage": 150},
        3: {"name": "Soul_Burn", "ap_cost": 3, "damage": 280, "self_damage": 40}
    }
    
    ELLIE_SKILLS = {
        0: {"name": "WAIT", "ap_cost": 0},
        1: {"name": "Heal", "ap_cost": 1, "heal": 60},
        2: {"name": "Transfuse", "ap_cost": 0, "heal": 150, "self_damage": 60},
        3: {"name": "Pray", "ap_cost": 2, "heal": 40, "is_aoe": True}  # 群体治疗
    }
    
    def __init__(self, render_mode: Optional[str] = None, reward_mode="detailed"):
        """
        初始化RPG Boss战斗环境
        
        Args:
            reward_mode (str): 奖励模式
                - "baseline": 简单基准奖励（无战术指导）
                - "detailed": 详细奖励系统（含战术指导）
        """
        super().__init__()
        
        # 奖励模式
        self.reward_mode = reward_mode
        if reward_mode == "baseline":
            print("🎮 奖励模式: BASELINE (简单基准奖励)")
        else:
            print("🎮 奖励模式: DETAILED (详细战术奖励)")
        
        self.render_mode = render_mode
        
        # 定义观测空间 (25维)
        self.observation_space = spaces.Box(
            low=0.0, high=1.0, shape=(25,), dtype=np.float32
        )
        
        # 定义动作空间
        # Arthur: 5动作, Merlin: 5动作, Ellie_Target: 4, Ellie_Skill: 4 (新增Pray)
        # FIXED: Action space应该是[4,4,4,4]，因为每个都是0-3
        # Arthur: 0-3 (WAIT, Shield_Bash, Taunt, Self_Destruct)
        # Merlin: 0-3 (WAIT, Missile, Fireball, Soul_Burn)
        # Ellie target: 0-3 (WAIT, Arthur, Merlin, Ellie)
        # Ellie skill: 0-3 (WAIT, Heal, Transfuse, Pray)
        self.action_space = spaces.MultiDiscrete([4, 4, 4, 4])
        
        self.state: Optional[GameState] = None
        self.last_reward_info: Dict = {}
    
    def reset(self, seed: Optional[int] = None, options: Optional[dict] = None) -> Tuple[np.ndarray, Dict]:
        """重置环境"""
        super().reset(seed=seed)
        
        # 初始化角色
        arthur = Character(
            id="Arthur", name="Tank", max_hp=450, current_hp=450, ap=3
        )
        merlin = Character(
            id="Merlin", name="Mage", max_hp=200, current_hp=200, ap=3
        )
        ellie = Character(
            id="Ellie", name="Healer", max_hp=250, current_hp=250, ap=3
        )
        
        self.state = GameState(
            turn=1,
            boss_cycle=0,
            total_damage_dealt=0,
            total_healing_done=0,
            arthur=arthur,
            merlin=merlin,
            ellie=ellie
        )
        
        obs = self._get_observation()
        info = {"turn": 1, "boss_cycle": 0}
        
        return obs, info
    
    def step(self, action: np.ndarray) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        """
        执行一步动作
        
        动作解析:
        - action[0]: Arthur的动作选择
        - action[1]: Merlin的动作选择  
        - action[2]: Ellie的目标选择
        - action[3]: Ellie的技能选择
        
        执行顺序: Arthur -> Merlin -> BOSS -> Ellie -> 清理
        """
        if self.state is None:
            raise RuntimeError("Environment not reset. Call reset() first.")
        
        state = self.state
        reward = 0.0
        reward_breakdown = {"arthur": 0.0, "merlin": 0.0, "boss": 0.0, "ellie": 0.0, "expert": 0.0, "delayed": 0.0}
        
        # FIXED: 记录本回合实际执行的技能（用于replay正确显示）
        state.executed_skills = {'arthur': None, 'merlin': None, 'ellie_skill': None, 'ellie_target': None}
        
        # FIXED: 记录Boss攻击信息（用于replay显示Boss行动）
        state.boss_attack_log = []  # 格式: [{"target": "角色名", "damage": 伤害值}]
        
        # FIXED: 记录行动战报（按执行顺序）
        state.action_report = []  # 格式: [{"actor": "角色名", "action": "行动描述"}]
        
        # ========== 回合开始：AP恢复 ==========
        for char in [state.arthur, state.merlin, state.ellie]:
            if not char.is_dead and char.ap < 3:
                char.ap += 1
        
        # FIXED: 记录AP恢复后的值（用于replay显示正确的"行动前AP"）
        ap_after_recovery = {
            'arthur': state.arthur.ap,
            'merlin': state.merlin.ap,
            'ellie': state.ellie.ap
        }
        
        # 记录回合开始前的状态（用于奖励计算）
        state.arthur_hp_before_boss = state.arthur.current_hp
        arthur_hp_before_action = state.arthur.current_hp  # 记录行动前HP
        boss_cycle_for_rewards = state.boss_cycle  # 记录当前cycle
        
        # ========== 1. Arthur行动 ==========
        arthur_reward = self._execute_arthur_action(action[0])
        reward += arthur_reward
        reward_breakdown["arthur"] = arthur_reward
        
        # ========== 2. Merlin行动 ==========
        merlin_reward = self._execute_merlin_action(action[1])
        reward += merlin_reward
        reward_breakdown["merlin"] = merlin_reward
        
        # ========== 3. BOSS行动 ==========
        boss_reward = self._execute_boss_turn()
        reward += boss_reward
        reward_breakdown["boss"] = boss_reward
        
        # FIXED: BOSS行动后：强制清除嘲讽状态（防止多回合残留）
        # 嘲讽只在本回合有效（Arthur开嘲讽 → Boss攻击 → 嘲讽失效）
        state.arthur.has_taunt = False
        
        # ========== 4. Ellie行动（BOSS后） ==========  
        ellie_reward = self._execute_ellie_action(action[2], action[3])
        reward += ellie_reward
        reward_breakdown["ellie"] = ellie_reward
        
        # ========== 5. 专家奖励 (战术指导) ==========
        # baseline模式：跳过战术奖励，只使用基础奖励
        if self.reward_mode == "detailed":
            # Define variables needed for _calculate_expert_reward based on action array
            arthur_action = action[0]
            merlin_action = action[1]
            ellie_target = action[2]
            ellie_skill = action[3]
            
            # Assuming 'state_before' is the state before any actions in this step,
            # which is implicitly handled by passing specific pre-action values.
            # For simplicity, we'll pass the current state and pre-action values.
            expert_r = self._calculate_expert_rewards( # Changed to plural to match existing method
                action, # Pass the full action array
                arthur_hp_before_action,
                boss_cycle_for_rewards
            )
            reward += expert_r
            reward_breakdown["expert"] = expert_r
        else:
            # baseline模式：无战术奖励
            expert_r = 0.0
            reward_breakdown["expert"] = 0.0
        
        # ========== 延迟奖励：治疗师预判奖励 ==========
        delayed_reward = self._calculate_healer_delayed_reward()
        reward += delayed_reward
        reward_breakdown["delayed"] = delayed_reward
        
        # ========== 回合结束清理 ==========
        # 关键：护盾清零
        state.arthur.shield = 0
        
        # 嘲讽已在Boss行动后清除，此处不需要重复
        
        # FIXED: Boss Cycle更新（在turn+1之前，确保replay显示正确）
        state.boss_cycle = (state.boss_cycle + 1) % 4
        
        # 回合计数
        state.turn += 1
        
        # ========== 判断游戏结束 ==========
        all_dead = all(char.is_dead for char in [state.arthur, state.ellie, state.merlin])
        max_turns_reached = state.turn > self.MAX_TURNS
        
        terminated = all_dead or max_turns_reached
        truncated = False
        
        # 最终巨额奖励
        if terminated:
            # 总伤害奖励（归一化到5000）
            final_damage_bonus = (state.total_damage_dealt / 5000.0) * 100
            reward += final_damage_bonus
            reward_breakdown["final"] = final_damage_bonus
        
        self.last_reward_info = reward_breakdown
        
        # ========== 学术数据采集 (Thesis Metrics) ==========
        # 记录详细的游戏指标用于论文分析
        obs = self._get_observation()
        info = {
            # 基础状态
            "turn": state.turn,
            "boss_cycle": state.boss_cycle,
            "reward_breakdown": reward_breakdown,
            
            # 核心性能指标 (Performance Metrics)
            "total_damage": state.total_damage_dealt,
            "survival_turns": state.turn - 1,  # 实际存活回合数
            "total_healing": state.total_healing_done,
            
            # 角色状态
            "arthur_hp": state.arthur.current_hp if not state.arthur.is_dead else 0,
            "merlin_hp": state.merlin.current_hp if not state.merlin.is_dead else 0,
            "ellie_hp": state.ellie.current_hp if not state.ellie.is_dead else 0,
            
            # 战术行为追踪 (Tactical Behavior)
            "self_destruct_turn": -1,  # 默认未自爆
            "healer_sacrifice": 0,      # 治疗师牺牲标记
            "soul_burn_count": 0,       # Soul Burn使用次数
            "taunt_count": 0,           # 嘲讽使用次数
            "pray_count": 0,            # 群奶使用次数
            
            # Episode完成标记
            "episode_complete": terminated,
            
            # FIXED: 实际执行的技能（用于replay正确显示）
            "executed_skills": state.executed_skills,
            
            # FIXED: AP恢复后的值（用于replay显示正确的行动前AP）
            "ap_after_recovery": ap_after_recovery,
            
            # FIXED: Boss攻击日志（用于replay显示Boss行动）
            "boss_attack_log": state.boss_attack_log if hasattr(state, 'boss_attack_log') else [],
            
            # FIXED: 行动战报（按执行顺序）
            "action_report": state.action_report if hasattr(state, 'action_report') else []
        }
        
        # 战术行为统计（需要在step中累积）
        if not hasattr(state, 'metrics'):
            state.metrics = {
                'soul_burn_count': 0,
                'taunt_count': 0,
                'pray_count': 0,
                'self_destruct_turn': -1
            }
        
        # 更新本回合的战术统计
        if action[0] == 3:  # Arthur Self Destruct
            state.metrics['self_destruct_turn'] = state.turn - 1
        if action[0] == 2:  # Arthur Taunt
            state.metrics['taunt_count'] += 1
        if action[1] == 3:  # Merlin Soul Burn
            state.metrics['soul_burn_count'] += 1
        if action[3] == 3:  # Ellie Pray
            state.metrics['pray_count'] += 1
        
        # Healer牺牲检测：Ellie死但Arthur活
        if state.ellie.is_dead and not state.arthur.is_dead:
            info["healer_sacrifice"] = 1
        
        # 复制metrics到info
        info["self_destruct_turn"] = state.metrics['self_destruct_turn']
        info["soul_burn_count"] = state.metrics['soul_burn_count']
        info["taunt_count"] = state.metrics['taunt_count']
        info["pray_count"] = state.metrics['pray_count']
        
        return obs, reward, terminated, truncated, info
    
    def _execute_arthur_action(self, action: int) -> float:
        """执行Arthur的动作"""
        arthur = self.state.arthur
        reward = 0.0
        
        if arthur.is_dead:
            return reward
        
        skill = self.ARTHUR_SKILLS.get(action, self.ARTHUR_SKILLS[0])
        
        # 检查AP
        if arthur.ap < skill["ap_cost"]:
            self.state.executed_skills['arthur'] = "WAIT (AP不足)"
            return -5.0  # AP不足惩罚
        
        # 执行技能
        if skill["name"] == "WAIT":
            # FIXED: 记录实际执行的技能
            self.state.executed_skills['arthur'] = "WAIT"
            # AP浪费惩罚
            if arthur.ap == 3:
                reward -= 2.0
        
        elif skill["name"] == "Shield_Bash":
            # FIXED: 记录实际执行的技能
            self.state.executed_skills['arthur'] = "Shield_Bash"
            arthur.ap -= 1
            # 造成伤害
            damage = skill["damage"]
            self.state.total_damage_dealt += damage
            reward += damage * 0.1  # 基础伤害奖励
            
            # 获得护盾
            arthur.shield += skill["shield"]
            
            # FIXED: 记录行动战报
            self.state.action_report.append(f"Arthur: Shield_Bash (造成{damage}伤害, 获得{skill['shield']}护盾)")
            
            # 战术惩罚：在Cycle 2使用护盾（BOSS无伤害回合）
            if self.state.boss_cycle == 2:
                reward -= 5.0  # 无效护盾惩罚
        
        elif skill["name"] == "Taunt":
            # FIXED: 移除冗余的AP检查，已经在上面检查过了
            # FIXED: 记录实际执行的技能
            self.state.executed_skills['arthur'] = "Taunt"
            arthur.ap -= 2
            arthur.has_taunt = True
            
            # FIXED: 记录行动战报
            self.state.action_report.append("Arthur: Taunt (开启嘲讽)")
            
            # Cycle 3前嘲讽奖励
            if self.state.boss_cycle == 3:
                reward += 20.0  # 关键时刻嘲讽
            elif self.state.boss_cycle == 2:
                reward += 10.0  # 预判嘲讽
        
        elif skill["name"] == "Self_Destruct":
            # FIXED: 记录实际执行的技能
            self.state.executed_skills['arthur'] = "Self_Destruct"
            # 自爆伤害 = BOSS已损失HP * 25%（按游戏规则："其"指BOSS）
            damage = int(self.state.total_damage_dealt * 0.25)
            
            self.state.total_damage_dealt += damage
            arthur.is_dead = True
            arthur.current_hp = 0
            
            # FIXED: 记录行动战报
            self.state.action_report.append(f"Arthur: Self_Destruct (自爆造成{damage}伤害)")
            
            # ========== 自爆时机奖励/惩罚 ==========
            hp_percent = arthur.current_hp / arthur.max_hp
            turn_factor = min(self.state.turn / 20.0, 1.0)
            arthur_hp_absolute = arthur.current_hp
            
            # 情况1: 满血自爆 → 严重惩罚
            if hp_percent > 0.8:
                reward -= 30.0
            
            # 情况2: 残血自爆 (HP < 50) → 大奖励
            elif arthur_hp_absolute < 50:
                reward += 80.0  # 聪明的牺牲！
                if damage > 300:
                    reward += 30.0  # 额外finisher bonus
            
            # 情况3: 中低血自爆 (HP < 30%) + 后期 → 奖励
            elif hp_percent < 0.3 and turn_factor > 0.5:
                reward += 50.0
            
            # 基础伤害奖励
            else:
                reward += damage * 0.2
        
        return reward
    
    def _execute_merlin_action(self, action: int) -> float:
        """执行Merlin的动作"""
        merlin = self.state.merlin
        reward = 0.0
        
        if merlin.is_dead:
            return reward
        
        skill = self.MERLIN_SKILLS.get(action, self.MERLIN_SKILLS[0])
        
        if merlin.ap < skill["ap_cost"]:
            self.state.executed_skills['merlin'] = "WAIT (AP不足)"
            return -5.0
        
        if skill["name"] == "WAIT":
            # FIXED: 记录实际执行
            self.state.executed_skills['merlin'] = "WAIT"
            if merlin.ap == 3:
                reward -= 2.0  # AP浪费
        
        elif skill["name"] in ["Missile", "Fireball"]:
            # FIXED: 记录实际执行
            self.state.executed_skills['merlin'] = skill["name"]
            merlin.ap -= skill["ap_cost"]
            damage = skill["damage"]
            self.state.total_damage_dealt += damage
            reward += damage * 0.1
            
            # FIXED: 记录行动战报
            self.state.action_report.append(f"Merlin: {skill['name']} (造成{damage}伤害)")
        
        elif skill["name"] == "Soul_Burn":
            # FIXED: 记录实际执行
            self.state.executed_skills['merlin'] = "Soul_Burn"
            merlin.ap -= 3
            damage = skill["damage"]
            self.state.total_damage_dealt += damage
            reward += damage * 0.15  # 高伤害技能额外奖励
            
            # 自伤
            self_damage = skill["self_damage"]
            merlin.current_hp -= self_damage
            
            # FIXED: 记录行动战报
            self.state.action_report.append(f"Merlin: Soul_Burn (造成{damage}伤害, 自伤{self_damage})")
            
            if merlin.current_hp <= 0:
                merlin.is_dead = True
                merlin.current_hp = 0
                # 牺牲输出奖励
                if self.state.turn > 10:
                    reward += 20.0
        
        return reward
    
    def _execute_boss_turn(self) -> float:
        """执行BOSS回合"""
        pattern = self.BOSS_PATTERNS[self.state.boss_cycle]
        reward = 0.0
        
        if pattern["type"] == "single":
            # 随机攻击（可被嘲讽）
            if self.state.arthur.has_taunt and not self.state.arthur.is_dead:
                target = self.state.arthur
                damage = int(pattern["damage"] * 0.3)  # 70%减伤
            else:
                # 随机选择存活目标
                alive = [c for c in [self.state.arthur, self.state.ellie, self.state.merlin] if not c.is_dead]
                if alive:
                    target = np.random.choice(alive)
                    damage = pattern["damage"]
                else:
                    return reward
            
            self._apply_damage(target, damage)
        
        elif pattern["type"] == "aoe":
            # 横扫全体
            for char in [self.state.arthur, self.state.ellie, self.state.merlin]:
                if not char.is_dead:
                    self._apply_damage(char, pattern["damage"])
        
        elif pattern["type"] == "mark":
            # 凝视：标记最低HP
            # FIXED: 清除所有旧标记，防止状态残留
            for c in [self.state.arthur, self.state.ellie, self.state.merlin]:
                c.is_gazed = False
            
            alive = [c for c in [self.state.arthur, self.state.ellie, self.state.merlin] if not c.is_dead]
            if alive:
                target = min(alive, key=lambda c: c.current_hp)
                target.is_gazed = True
        
        elif pattern["type"] == "execute":
            # 找到处决的目标
            target = None
            
            # 1. 优先嘲讽者
            if self.state.arthur.has_taunt and not self.state.arthur.is_dead:
                target = self.state.arthur
            else:
                # 2. 其次是被标记且存活的角色
                gazed = next((c for c in [self.state.arthur, self.state.ellie, self.state.merlin] if c.is_gazed and not c.is_dead), None)
                if gazed:
                    target = gazed
                else:
                    # 3. 否则随机选择一个存活目标
                    alive = [c for c in [self.state.arthur, self.state.ellie, self.state.merlin] if not c.is_dead]
                    if alive:
                        # 转换成 deterministic/random 保证 RL 逻辑和 JS 统一
                        target = np.random.choice(alive)
            
            if target:
                # 伤害计算
                damage = pattern["damage"]
                # 如果目标是 Arthur 且其拥有嘲讽，则减免 70% 伤害
                if target.id == "Arthur" and target.has_taunt:
                    damage = int(damage * 0.3)
                
                self._apply_damage(target, damage)
                
            # 清除所有Gaze标记
            for c in [self.state.arthur, self.state.ellie, self.state.merlin]:
                c.is_gazed = False
        
        return reward
    
    def _execute_ellie_action(self, target: int, skill: int) -> float:
        """
        执行Ellie的动作
        target: 0=WAIT, 1=Arthur, 2=Merlin, 3=Ellie
        skill: 0=WAIT, 1=Heal, 2=Transfuse, 3=Pray (AoE)
        """
        ellie = self.state.ellie
        reward = 0.0
        
        if ellie.is_dead:
            return reward
        
        skill_data = self.ELLIE_SKILLS.get(skill, self.ELLIE_SKILLS[0])
        
        # 记录目标
        self.state.executed_skills['ellie_target'] = target
        
        if ellie.ap < skill_data["ap_cost"]:
            self.state.executed_skills['ellie_skill'] = "WAIT (AP不足)"
            return -5.0
        
        # 记录是否使用了Transfuse（用于延迟奖励）
        self.state.ellie_transfused_last_turn = (skill == 2)
        
        if skill_data["name"] == "WAIT":
            # FIXED: 记录实际执行
            self.state.executed_skills['ellie_skill'] = "WAIT"
            if ellie.ap == 3:
                reward -= 2.0
        
        elif skill_data["name"] == "Pray":
            # FIXED: 记录实际执行
            self.state.executed_skills['ellie_skill'] = "Pray"
            # 群体治疗 (AoE Heal)
            ellie.ap -= skill_data["ap_cost"]
            heal_amount = skill_data["heal"]
            
            total_healing = 0
            healed_chars = []
            for char in [self.state.arthur, self.state.ellie, self.state.merlin]:
                if not char.is_dead and char.current_hp < char.max_hp:
                    actual_heal = min(heal_amount, char.max_hp - char.current_hp)
                    char.current_hp += actual_heal
                    total_healing += actual_heal
                    healed_chars.append(char)
            
            self.state.total_healing_done += total_healing
            reward += total_healing * 0.05  # 基础治疗奖励
            
            # FIXED: 记录行动战报
            self.state.action_report.append(f"Ellie: Pray (群体治疗{total_healing}, {len(healed_chars)}人)")
        
        elif skill_data["name"] in ["Heal", "Transfuse"]:
            # FIXED: 记录实际执行
            self.state.executed_skills['ellie_skill'] = skill_data["name"]
            # 单体治疗
            target_map = {0: None, 1: self.state.arthur, 2: self.state.merlin, 3: ellie}
            target_char = target_map.get(target)
            
            # ========== Transfuse不能对自己使用 ==========
            if skill_data["name"] == "Transfuse" and target == 3:
                return -10.0  # 违规惩罚
            
            if target_char and not target_char.is_dead:
                ellie.ap -= skill_data["ap_cost"]
                
                # 治疗
                heal_amount = skill_data["heal"]
                old_hp = target_char.current_hp
                actual_heal = min(heal_amount, target_char.max_hp - target_char.current_hp)
                target_char.current_hp += actual_heal
                self.state.total_healing_done += actual_heal
                reward += actual_heal * 0.05
                
                # Transfuse自伤
                if skill_data["name"] == "Transfuse":
                    self_damage = skill_data["self_damage"]
                    ellie.current_hp -= self_damage
                    
                    # FIXED: 记录行动战报
                    target_name = ["None", "Arthur", "Merlin", "Ellie"][target]
                    self.state.action_report.append(f"Ellie: Transfuse → {target_name} (+{actual_heal}HP, 自伤{self_damage})")
                    
                    if ellie.current_hp <= 0:
                        ellie.is_dead = True
                        ellie.current_hp = 0
                        # 牺牲治疗奖励
                        if target_char == self.state.arthur and target_char.current_hp > 200:
                            reward += 30.0
                else:
                    # Heal
                    target_name = ["None", "Arthur", "Merlin", "Ellie"][target]
                    self.state.action_report.append(f"Ellie: Heal → {target_name} (+{actual_heal}HP)")
        
        return reward
    
    def _calculate_expert_rewards(
        self, 
        action: np.ndarray,
        arthur_hp_before: int,
        cycle_before: int
    ) -> float:
        """
        专家级稠密奖励系统
        实现5个关键战术奖励，引导AI学习人类专家级策略
        
        参数:
            action: 本回合的动作 [arthur_action, merlin_action, ellie_target, ellie_skill]
            arthur_hp_before: Arthur行动前的HP
            cycle_before: 行动前的Boss Cycle
        
        返回:
            累积的专家奖励值
        """
        reward = 0.0
        state = self.state
        
        # 获取角色
        arthur = state.arthur
        merlin = state.merlin
        ellie = state.ellie
        
        # 解析动作
        arthur_action = action[0]
        ellie_target = action[2]
        ellie_skill = action[3]
        
        # ========== 1. Turn-3 预判治疗 (+80) ==========
        # 触发条件: Boss Cycle 2 (凝视回合，行动前) 且 Arthur HP < 350 (行动前)
        if cycle_before == 2 and not arthur.is_dead:
            danger_threshold = 350
            
            if arthur_hp_before < danger_threshold:
                # Ellie 使用了 Heal 或 Transfuse 且目标是 Arthur
                if ellie_target == 1 and ellie_skill in [1, 2] and not ellie.is_dead:
                    reward += 80.0
                    # 额外检查：治疗后Arthur是否达到安全线
                    if ellie_skill == 1:  # Heal
                        hp_after = min(arthur.max_hp, arthur_hp_before + 60)
                    else:  # Transfuse
                        hp_after = min(arthur.max_hp, arthur_hp_before + 150)
                    
                    if hp_after >= 350:
                        reward += 20.0  # 额外奖励：完美预判
        
        # ========== 2. Turn-4 嘲讽 (+100) ==========
        # 触发条件: Boss Cycle 3 (处决回合，行动前)
        if cycle_before == 3 and not arthur.is_dead:
            # Arthur 开启了 Taunt (使用已执行动作判定，避免AP扣除后的检查误差)
            if state.executed_skills.get('arthur') == "Taunt":
                reward += 100.0
                
                # 额外奖励：嘲讽后存活
                if not arthur.is_dead:
                    reward += 30.0
            else:
                # 未嘲讽惩罚
                reward -= 100.0
        
        # ========== 3. Ellie 英雄牺牲 (+200) ==========
        # 触发条件: Arthur HP < 300 (BOSS攻击后的HP) 且 Ellie 使用 Transfuse (即使Ellie因此牺牲也奖励)
        if not arthur.is_dead:
            # 使用BOSS攻击后的HP判断
            if state.arthur_hp_before_boss < 300 and ellie_skill == 2 and ellie_target == 1:
                reward += 200.0
                
                # 额外加分：Ellie 因此死亡或HP危急
                if ellie.is_dead or ellie.current_hp < 30:
                    reward += 50.0
        
        # ========== 4. 灾后重建 - Post-Execute Recovery (+40) ==========
        # 触发条件: Boss Cycle 0 (刚处决完，行动前) 且 Arthur 存活
        if cycle_before == 0 and not arthur.is_dead and state.turn > 4:
            # 任何对 Arthur 的有效治疗
            if ellie_target == 1 and ellie_skill in [1, 2] and not ellie.is_dead:
                reward += 40.0
        
        # ========== 5. 生存里程碑 (+50/100/150) ==========
        # 在回合结束时结算（基于turn计数）
        current_turn = state.turn
        
        # 度过关键回合
        if current_turn == 4:
            # 刚度过Turn 4 (第一次处决)
            alive_count = sum(not c.is_dead for c in [arthur, merlin, ellie])
            if alive_count >= 2:
                reward += 50.0
        
        elif current_turn == 8:
            # 度过Turn 8 (第二次处决)
            alive_count = sum(not c.is_dead for c in [arthur, merlin, ellie])
            if alive_count >= 2:
                reward += 100.0
        
        elif current_turn == 12:
            # 度过Turn 12 (第三次处决)
            alive_count = sum(not c.is_dead for c in [arthur, merlin, ellie])
            if alive_count >= 1:
                reward += 150.0
        
        # ========== 6. 群体治疗 Pray (+60/+80) ==========
        # 触发条件: Ellie使用Pray (AoE heal)
        if ellie_skill == 3 and not ellie.is_dead:
            # 情况A: Boss Cycle 1 (横扫AOE) - 预判性群奶
            if cycle_before == 1:
                reward += 60.0  # 完美时机！抵消AOE伤害
            
            # 情况B: 全队低血 (3人存活且平均HP < 60%)
            alive_chars = [c for c in [arthur, merlin, ellie] if not c.is_dead]
            if len(alive_chars) == 3:
                avg_hp_percent = sum(c.current_hp / c.max_hp for c in alive_chars) / 3
                if avg_hp_percent < 0.6:
                    reward += 80.0  # 团队低血群奶
        
        return reward
    
    def _calculate_healer_delayed_reward(self) -> float:
        """
        计算治疗师的延迟奖励
        
        逻辑：如果上回合Ellie使用了Transfuse，且本回合Arthur承受了巨额伤害但存活，
        给予额外奖励（说明Ellie的预判救了Arthur）
        """
        if not self.state.ellie_transfused_last_turn:
            return 0.0
        
        arthur = self.state.arthur
        hp_lost = self.state.arthur_hp_before_boss - arthur.current_hp
        
        # 如果Arthur承受了>200伤害但存活
        if hp_lost > 200 and not arthur.is_dead and arthur.current_hp < 100:
            return 25.0  # 延迟奖励：预判成功！
        
        return 0.0
    
    def _apply_damage(self, target, damage: int):
        """对角色造成伤害（考虑护盾）"""
        if target.is_dead:
            return
        
        # 记录受伤前的HP（用于计算实际伤害）
        hp_before = target.current_hp
        shield_before = target.shield if hasattr(target, 'shield') else 0
        
        # 护盾吸收
        if hasattr(target, 'shield') and target.shield > 0:
            if target.shield >= damage:
                target.shield -= damage
                actual_damage = 0
            else:
                remaining = damage - target.shield
                target.shield = 0
                target.current_hp -= remaining
                actual_damage = remaining
        else:
            target.current_hp -= damage
            actual_damage = damage
        
        # 检查死亡
        if target.current_hp <= 0:
            target.is_dead = True
            target.current_hp = 0
        
        # FIXED: 记录Boss攻击日志（用于replay）
        # 确定目标名称
        target_name = "Unknown"
        if target == self.state.arthur:
            target_name = "Arthur"
        elif target == self.state.merlin:
            target_name = "Merlin"
        elif target == self.state.ellie:
            target_name = "Ellie"
        
        # 记录攻击信息（显示实际造成的伤害，考虑护盾）
        if hasattr(self.state, 'boss_attack_log'):
            self.state.boss_attack_log.append({
                "target": target_name,
                "damage": damage,
                "actual_damage": actual_damage,
                "shield_absorbed": shield_before - (target.shield if hasattr(target, 'shield') else 0)
            })
    
    def _get_observation(self) -> np.ndarray:
        """
        构建观测向量（25维）
        
        包含：
        1. Boss Cycle One-Hot [4]
        2. Arthur状态 [6]
        3. Merlin状态 [4]  
        4. Ellie状态 [4]
        5. 全局状态 [4]
        6. AP可用性 [3]
        """
        obs = []
        
        # 1. Boss Cycle One-Hot (关键！)
        cycle_onehot = [0.0] * 4
        cycle_onehot[self.state.boss_cycle] = 1.0
        obs.extend(cycle_onehot)
        
        # 2. Arthur状态
        arthur = self.state.arthur
        obs.extend([
            arthur.current_hp / arthur.max_hp,
            arthur.ap / 3.0,
            arthur.shield / 100.0,  # 归一化
            1.0 if arthur.has_taunt else 0.0,
            1.0 if arthur.is_dead else 0.0,
            1.0 if arthur.is_gazed else 0.0
        ])
        
        # 3. Merlin状态
        merlin = self.state.merlin
        obs.extend([
            merlin.current_hp / merlin.max_hp,
            merlin.ap / 3.0,
            1.0 if merlin.is_dead else 0.0,
            1.0 if merlin.is_gazed else 0.0
        ])
        
        # 4. Ellie状态
        ellie = self.state.ellie
        obs.extend([
            ellie.current_hp / ellie.max_hp,
            ellie.ap / 3.0,
            1.0 if ellie.is_dead else 0.0,
            1.0 if ellie.is_gazed else 0.0
        ])
        
        # 5. 全局状态
        # Turn (归一化到50回合)
        obs.append(min(self.state.turn / 50.0, 1.0))
        
        # Total Damage (归一化到5000)
        obs.append(min(self.state.total_damage_dealt / 5000.0, 1.0))
        
        # Safety Margin: Arthur血量与300的差值（归一化）
        safety_margin = (arthur.current_hp - 300) / 450.0
        obs.append(max(-1.0, min(1.0, safety_margin)))
        
        # Next Turn Predicted Damage（作弊特征）
        next_cycle = (self.state.boss_cycle + 1) % 4
        predicted_damage = self.BOSS_PATTERNS[next_cycle]["damage"]
        if next_cycle == 3 and arthur.has_taunt:
            predicted_damage = int(predicted_damage * 0.3)
        obs.append(min(predicted_damage / 999.0, 1.0))
        
        # 6. AP可用性检查
        obs.extend([
            1.0 if arthur.ap >= 2 else 0.0,  # 可以嘲讽
            1.0 if merlin.ap >= 3 else 0.0,  # 可以燃魂
            1.0 if ellie.ap >= 1 else 0.0    # 可以治疗
        ])
        
        return np.array(obs, dtype=np.float32)
    
    def render(self):
        """渲染环境状态"""
        if self.render_mode != "human":
            return
        
        print(f"\n{'='*60}")
        print(f"Turn {self.state.turn} | Boss Cycle: {self.state.boss_cycle} ({self.BOSS_PATTERNS[self.state.boss_cycle]['name']})")
        print(f"Total Damage: {self.state.total_damage_dealt}")
        print(f"{'='*60}")
        
        for char in [self.state.arthur, self.state.ellie, self.state.merlin]:
            status = "💀" if char.is_dead else f"HP: {char.current_hp}/{char.max_hp}"
            shield_str = f" | Shield: {char.shield}" if char.shield > 0 else ""
            taunt_str = " | 🛡️TAUNT" if char.has_taunt else ""
            gaze_str = " | 👁️GAZED" if char.is_gazed else ""
            
            print(f"{char.name:8} | {status:20} | AP: {char.ap}{shield_str}{taunt_str}{gaze_str}")
        
        if self.last_reward_info:
            print(f"\nReward Breakdown: {self.last_reward_info}")
        print(f"{'='*60}\n")


# ========== 测试代码 ==========
if __name__ == "__main__":
    # 创建环境
    env = RPGBossFightEnv(render_mode="human")
    
    # 测试一个episode
    obs, info = env.reset()
    print(f"Observation shape: {obs.shape}")
    print(f"Observation space: {env.observation_space}")
    print(f"Action space: {env.action_space}\n")
    
    # 运行几个回合
    for i in range(10):
        # 随机动作
        action = env.action_space.sample()
        obs, reward, terminated, truncated, info = env.step(action)
        
        env.render()
        print(f"Reward: {reward:.2f}")
        
        if terminated or truncated:
            print("\n🎮 Game Over!")
            break
    
    print("\n✅ Environment test completed!")
