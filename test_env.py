"""
环境验收检查脚本
检查RPGBossFightEnv是否符合规格说明书的三个关键点
"""

from rpg_boss_fight_env import RPGBossFightEnv
import numpy as np


def check_shield_clearing():
    """检查点1: 护盾是否在回合结束时清零"""
    print("\n" + "="*60)
    print("检查点 1: 护盾清零机制")
    print("="*60)
    
    env = RPGBossFightEnv()
    env.reset()
    
    # Arthur使用Shield_Bash
    action = [1, 0, 0, 0]  # Arthur: Shield_Bash, 其他WAIT
    obs, reward, terminated, truncated, info = env.step(action)
    
    # 检查护盾是否清零
    shield_before = 30  # Shield_Bash给30盾
    shield_after = env.state.arthur.shield
    
    print(f"Shield_Bash后应该获得30盾 -> 回合结束后清零")
    print(f"实际结果: shield = {shield_after}")
    
    if shield_after == 0:
        print("✅ PASS: 护盾已正确清零")
        return True
    else:
        print(f"❌ FAIL: 护盾未清零! shield={shield_after}")
        return False


def check_self_destruct_damage():
    """检查点2: 自爆伤害计算公式"""
    print("\n" + "="*60)
    print("检查点 2: 自爆伤害公式")
    print("="*60)
    
    env = RPGBossFightEnv()
    env.reset()
    
    # 先打一些伤害
    for i in range(5):
        action = [1, 3, 0, 0]  # Arthur Shield_Bash, Merlin Soul_Burn
        obs, reward, terminated, truncated, info = env.step(action)
        if terminated:
            break
    
    total_damage_before = env.state.total_damage_dealt
    
    # Arthur自爆
    action = [3, 0, 0, 0]  # Arthur: Self_Destruct
    obs, reward, terminated, truncated, info = env.step(action)
    
    total_damage_after = env.state.total_damage_dealt
    self_destruct_damage = total_damage_after - total_damage_before
    
    # 计算期望伤害
    expected_damage = int(total_damage_before * 0.25)
    
    print(f"BOSS已损失血量: {total_damage_before}")
    print(f"期望自爆伤害: {expected_damage} (= {total_damage_before} * 0.25)")
    print(f"实际自爆伤害: {self_destruct_damage}")
    
    if self_destruct_damage == expected_damage:
        print("✅ PASS: 自爆伤害公式正确")
        return True
    else:
        print(f"❌ FAIL: 自爆伤害错误! 期望{expected_damage}，实际{self_destruct_damage}")
        return False


def check_boss_cycle_in_observation():
    """检查点3: Boss Cycle是否在观测空间中"""
    print("\n" + "="*60)
    print("检查点 3: Boss Cycle One-Hot编码")
    print("="*60)
    
    env = RPGBossFightEnv()
    obs, info = env.reset()
    
    print(f"观测空间维度: {obs.shape} (应该是25维)")
    print(f"前4维应该是Boss Cycle One-Hot编码")
    print(f"实际前4维: {obs[:4]}")
    
    # Boss Cycle 0, 应该是[1, 0, 0, 0]
    expected = np.array([1.0, 0.0, 0.0, 0.0])
    
    if np.array_equal(obs[:4], expected):
        print("✅ PASS: Boss Cycle正确编码在观测中")
        
        # 测试循环
        action = [0, 0, 0, 0]
        for i in range(1, 4):
            obs, _, _, _, _ = env.step(action)
            cycle = env.state.boss_cycle
            print(f"  回合{i+1}, Cycle={cycle}, One-Hot={obs[:4]}")
        
        return True
    else:
        print(f"❌ FAIL: Boss Cycle编码错误! 期望{expected}，实际{obs[:4]}")
        return False


def run_full_game_demo():
    """完整游戏演示"""
    print("\n" + "="*60)
    print("完整游戏演示 (10回合)")
    print("="*60)
    
    env = RPGBossFightEnv(render_mode="human")
    obs, info = env.reset()
    
    for i in range(10):
        # 简单策略：
        # Arthur: Cycle 3时嘲讽，否则Shield_Bash
        # Merlin: 有3 AP就Soul_Burn
        # Ellie: 始终治疗Arthur
        
        arthur_action = 2 if env.state.boss_cycle == 3 and env.state.arthur.ap >= 2 else 1
        merlin_action = 3 if env.state.merlin.ap >= 3 else 0
        ellie_target = 1  # Arthur
        ellie_skill = 1   # Heal
        
        action = [arthur_action, merlin_action, ellie_target, ellie_skill]
        obs, reward, terminated, truncated, info = env.step(action)
        
        env.render()
        
        if terminated:
            print(f"\n最终伤害: {info['total_damage']}")
            break


if __name__ == "__main__":
    print("\n🔬 RPG Boss Fight Environment 验收测试")
    print("="*60)
    
    results = []
    
    # 运行三个关键检查
    results.append(("护盾清零", check_shield_clearing()))
    results.append(("自爆伤害", check_self_destruct_damage()))
    results.append(("Boss Cycle观测", check_boss_cycle_in_observation()))
    
    # 总结
    print("\n" + "="*60)
    print("验收结果总结")
    print("="*60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 所有检查通过！环境符合规格说明书要求。")
        
        # 运行演示
        run_full_game_demo()
    else:
        print("\n⚠️  存在问题，请修复后重新测试。")
