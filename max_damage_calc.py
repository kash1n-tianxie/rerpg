#!/usr/bin/python3
# -*- coding: utf-8 -*-

"""
JRPG Boss Fight - Max Damage Solver via Dynamic Programming
用于计算在最佳运气与完美协调策略下，50回合内对Boss造成的理论绝对伤害上限。
"""

import argparse
import time

def solve_fast(state_limit=40000, max_turns=50):
    # 初始状态，即第1回合AP回复前的生命值和AP状态：
    # (a_hp, a_ap, m_hp, m_ap, e_hp, e_ap, gazed)
    # Arthur (450 HP, 3 AP), Merlin (200 HP, 3 AP), Ellie (250 HP, 3 AP), 0 (无凝视)
    current_states = {
        (450, 3, 200, 3, 250, 3, 0): 0.0
    }
    
    start_time = time.time()
    global_max_dmg = 0.0
    
    print(f"[*] 开始计算最大伤害... 回合上限: {max_turns}, 状态限制: {state_limit}")
    
    for turn in range(1, max_turns + 1):
        next_states = {}
        cycle = (turn - 1) % 4
        
        # 基于分桶 (Bucket-based) 的状态剪枝：
        # 如果不分桶，单纯按照伤害大小全局排序，DP会剪掉早期伤害低但生存/资源状况更好的最优潜在大后期状态。
        # 因此我们将状态按 (Arthur_HP_Bucket, Arthur_AP, Merlin_HP_Bucket, Merlin_AP, Ellie_HP_Bucket, Ellie_AP, gazed) 分桶，
        # 在每个分桶内仅保留造成伤害最高的那一个状态。
        buckets = {}
        for state, total_dmg in current_states.items():
            a_hp, a_ap, m_hp, m_ap, e_hp, e_ap, gazed = state
            
            # 对生命值分桶，减少解空间大小，同时保留生命值多样性
            a_hp_b = a_hp // 30
            m_hp_b = m_hp // 20
            e_hp_b = e_hp // 25
            
            b_key = (a_hp_b, a_ap, m_hp_b, m_ap, e_hp_b, e_ap, gazed)
            if b_key not in buckets or total_dmg > buckets[b_key][1]:
                buckets[b_key] = (state, total_dmg)
                
        # 更新 current_states 为每个分桶中最优的那个状态
        current_states = {state: total_dmg for state, total_dmg in buckets.values()}
        
        # 限制状态空间大小，避免指数级爆炸与执行过慢
        if len(current_states) > state_limit:
            sorted_states = sorted(current_states.items(), key=lambda x: x[1], reverse=True)
            current_states = dict(sorted_states[:state_limit])
            
        # 实时打印进度
        if turn % 5 == 0 or turn == max_turns or turn == 1:
            max_so_far = max(current_states.values()) if current_states else 0.0
            print(f"  - Turn {turn:02d}: 当前保留 {len(current_states)} 个状态. 阶段最高累计伤害: {max_so_far:.1f}")
        
        for state, total_dmg in current_states.items():
            a_hp, a_ap, m_hp, m_ap, e_hp, e_ap, gazed = state
            
            # 0. 回合开始时自动回复 1点 AP（已阵亡角色除外）
            a_ap_start = min(3, a_ap + 1) if a_hp > 0 else 0
            m_ap_start = min(3, m_ap + 1) if m_hp > 0 else 0
            e_ap_start = min(3, e_ap + 1) if e_hp > 0 else 0
            
            # Arthur (坦克) 动作分支
            a_options = []
            if a_hp > 0:
                a_options.append((0, 0, 0, "WAIT"))
                if a_ap_start >= 1:
                    a_options.append((1, 1, 20, "Shield_Bash"))
                if a_ap_start >= 2:
                    a_options.append((2, 2, 0, "Taunt"))
                a_options.append((3, 0, 0, "Self_Destruct"))
            else:
                a_options.append((0, 0, 0, "DEAD"))
                
            # Merlin (法师) 动作分支
            m_options = []
            if m_hp > 0:
                m_options.append((0, 0, 0, "WAIT"))
                if m_ap_start >= 1:
                    m_options.append((1, 1, 60, "Missile"))
                if m_ap_start >= 2:
                    m_options.append((2, 2, 150, "Fireball"))
                if m_ap_start >= 3:
                    m_options.append((3, 3, 280, "Soul_Burn"))
            else:
                m_options.append((0, 0, 0, "DEAD"))
                
            # Ellie (治疗师) 动作分支
            e_options = []
            if e_hp > 0:
                e_options.append((0, 0, "WAIT", 0))
                if e_ap_start >= 1:
                    if a_hp > 0: e_options.append((1, 1, "Heal_Arthur", 1)) 
                    if m_hp > 0: e_options.append((1, 2, "Heal_Merlin", 1))
                    e_options.append((1, 3, "Heal_Ellie", 1))
                if a_hp > 0: e_options.append((2, 1, "Transfuse_Arthur", 0))
                if m_hp > 0: e_options.append((2, 2, "Transfuse_Merlin", 0))
                if e_ap_start >= 2:
                    e_options.append((3, 0, "Pray", 2))
            else:
                e_options.append((0, 0, "DEAD", 0))
                
            for a_act in a_options:
                for m_act in m_options:
                    for e_act in e_options:
                        # 状态复制与技能消耗模拟
                        next_a_hp, next_a_ap = a_hp, a_ap_start
                        next_m_hp, next_m_ap = m_hp, m_ap_start
                        next_e_hp, next_e_ap = e_hp, e_ap_start
                        next_gazed = gazed
                        
                        base_dmg = 0.0
                        self_destructed = (a_act[3] == "Self_Destruct")
                        
                        # 1. Arthur 动作阶段
                        a_taunt = False
                        a_shield = 0
                        if a_act[3] == "Shield_Bash":
                            next_a_ap -= 1
                            a_shield = 30
                            base_dmg += 20
                        elif a_act[3] == "Taunt":
                            next_a_ap -= 2
                            a_taunt = True
                        elif a_act[3] == "Self_Destruct":
                            next_a_hp = 0
                        
                        # 2. Merlin 动作阶段
                        m_self_dmg = 0
                        if m_act[3] == "Missile":
                            next_m_ap -= 1
                            base_dmg += 60
                        elif m_act[3] == "Fireball":
                            next_m_ap -= 2
                            base_dmg += 150
                        elif m_act[3] == "Soul_Burn":
                            next_m_ap -= 3
                            base_dmg += 280
                            m_self_dmg = 40
                            
                        if m_self_dmg > 0 and next_m_hp > 0:
                            next_m_hp = max(0, next_m_hp - m_self_dmg)
                            
                        # 3. BOSS 动作阶段
                        alive_chars = []
                        if next_a_hp > 0: alive_chars.append(1)
                        if next_m_hp > 0: alive_chars.append(2)
                        if next_e_hp > 0: alive_chars.append(3)
                        
                        boss_targets = []
                        if cycle == 0:  # 随机攻击 (60 伤害)
                            if a_taunt and next_a_hp > 0:
                                boss_targets = [(1, 18)]  # Arthur 嘲讽: 60 * 0.3 = 18 伤害
                            else:
                                for tid in alive_chars:
                                    boss_targets.append((tid, 60))
                            if not boss_targets:
                                boss_targets = [(0, 0)]
                        elif cycle == 1:  # 全体横扫 (全体 40 伤害)
                            boss_targets = [("all", 40)]
                        elif cycle == 2:  # 凝视 (无伤害, 标记当前HP最低存活角色)
                            hp_list = []
                            if next_a_hp > 0: hp_list.append((1, next_a_hp))
                            if next_m_hp > 0: hp_list.append((2, next_m_hp))
                            if next_e_hp > 0: hp_list.append((3, next_e_hp))
                            
                            if hp_list:
                                min_hp = min(hp_list, key=lambda x: x[1])[1]
                                gazed_targets = [x[0] for x in hp_list if x[1] == min_hp]
                                gazed_target = None
                                # HP相同时的优先级：Arthur(1) -> Ellie(3) -> Merlin(2)
                                for cid in [1, 3, 2]:
                                    if cid in gazed_targets:
                                        gazed_target = cid
                                        break
                                boss_targets = [("gaze", gazed_target)]
                            else:
                                boss_targets = [("gaze", 0)]
                        elif cycle == 3:  # 处决 (999 真实伤害)
                            if a_taunt and next_a_hp > 0:
                                boss_targets = [(1, 299)]  # Arthur 嘲讽处决: 999 * 0.3 = 299 伤害并存活
                            else:
                                gazed_id = gazed
                                if gazed_id > 0 and (
                                    (gazed_id == 1 and next_a_hp > 0) or 
                                    (gazed_id == 2 and next_m_hp > 0) or 
                                    (gazed_id == 3 and next_e_hp > 0)
                                ):
                                    boss_targets = [(gazed_id, 999)]
                                else:
                                    # Gaze目标阵亡后的Fallback：随机从生存者中选一个处决。
                                    # 在全局DP状态转移中，我们对所有存活对象进行分支展开，以求解绝对最大伤害。
                                    boss_targets = []
                                    if next_a_hp > 0: boss_targets.append((1, 999))
                                    if next_m_hp > 0: boss_targets.append((2, 999))
                                    if next_e_hp > 0: boss_targets.append((3, 999))
                            
                            if not boss_targets:
                                boss_targets = [(0, 0)]
                                
                        for bt in boss_targets:
                            # 结算 Boss 伤害并更新 HP
                            bt_a_hp, bt_m_hp, bt_e_hp = next_a_hp, next_m_hp, next_e_hp
                            bt_gazed = next_gazed
                            
                            if cycle == 0 or cycle == 3:
                                tid, boss_dmg = bt
                                if tid == 1 and bt_a_hp > 0:
                                    bt_a_hp = max(0, bt_a_hp - max(0, boss_dmg - a_shield))
                                elif tid == 2 and bt_m_hp > 0:
                                    bt_m_hp = max(0, bt_m_hp - boss_dmg)
                                elif tid == 3 and bt_e_hp > 0:
                                    bt_e_hp = max(0, bt_e_hp - boss_dmg)
                            elif cycle == 1:
                                boss_dmg = bt[1]
                                if bt_a_hp > 0: bt_a_hp = max(0, bt_a_hp - max(0, boss_dmg - a_shield))
                                if bt_m_hp > 0: bt_m_hp = max(0, bt_m_hp - boss_dmg)
                                if bt_e_hp > 0: bt_e_hp = max(0, bt_e_hp - boss_dmg)
                            elif cycle == 2:
                                bt_gazed = bt[1]
                                
                            if cycle == 3:
                                bt_gazed = 0  # 处决完后清除标记
                                
                            # 4. Ellie (治疗师) 动作阶段
                            final_a_hp, final_m_hp, final_e_hp, final_e_ap = bt_a_hp, bt_m_hp, bt_e_hp, next_e_ap
                            
                            e_skill, e_target = e_act[0], e_act[1]
                            if final_e_hp > 0:
                                if e_skill == 1:  # 单体治疗 (Heal)
                                    final_e_ap -= 1
                                    if e_target == 1 and final_a_hp > 0: final_a_hp = min(450, final_a_hp + 60)
                                    elif e_target == 2 and final_m_hp > 0: final_m_hp = min(200, final_m_hp + 60)
                                    elif e_target == 3 and final_e_hp > 0: final_e_hp = min(250, final_e_hp + 60)
                                elif e_skill == 2:  # 紧急输血 (Transfuse, 消耗 0 AP, 自伤 60)
                                    final_e_hp = max(0, final_e_hp - 60)
                                    if e_target == 1 and final_a_hp > 0: final_a_hp = min(450, final_a_hp + 150)
                                    elif e_target == 2 and final_m_hp > 0: final_m_hp = min(200, final_m_hp + 150)
                                elif e_skill == 3:  # 群体祈祷 (Pray, 消耗 2 AP)
                                    final_e_ap -= 2
                                    if final_a_hp > 0: final_a_hp = min(450, final_a_hp + 40)
                                    if final_m_hp > 0: final_m_hp = min(200, final_m_hp + 40)
                                    if final_e_hp > 0: final_e_hp = min(250, final_e_hp + 40)
                                    
                            # 结算造成的有效伤害 (Arthur 自爆结算)
                            eff_dmg = float(base_dmg)
                            if self_destructed:
                                self_destruct_dmg = int(total_dmg * 0.25)
                                eff_dmg += self_destruct_dmg
                                
                            new_dmg = total_dmg + eff_dmg
                            global_max_dmg = max(global_max_dmg, new_dmg)
                            
                            # 检查全灭终止条件
                            all_dead = (final_a_hp <= 0 and final_m_hp <= 0 and final_e_hp <= 0)
                            if all_dead:
                                continue
                                
                            next_state = (final_a_hp, next_a_ap, final_m_hp, next_m_ap, final_e_hp, final_e_ap, bt_gazed)
                            
                            if next_state not in next_states or new_dmg > next_states[next_state]:
                                next_states[next_state] = new_dmg
                                
        current_states = next_states
        
    duration = time.time() - start_time
    print(f"[*] 状态搜索完成！")
    print(f"    - 耗时: {duration:.2f} 秒")
    print(f"    - 全局绝对累计伤害物理上限: {global_max_dmg:.1f} 点")
    return global_max_dmg

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="JRPG Boss Fight - Dynamic Programming Damage Solver")
    parser.add_argument("--states", type=int, default=40000, help="单回合最大保留状态数量 (用于剪枝, 默认 40000)")
    parser.add_argument("--turns", type=int, default=50, help="战斗总回合数 (默认 50)")
    args = parser.parse_args()
    
    solve_fast(state_limit=args.states, max_turns=args.turns)
