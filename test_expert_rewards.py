"""
专家奖励系统测试脚本
验证5个稠密奖励是否正常触发
"""

from rpg_boss_fight_env import RPGBossFightEnv
import numpy as np


def test_expert_rewards():
    """测试专家奖励系统"""
    env = RPGBossFightEnv(render_mode="human")
    
    print("\n" + "="*60)
    print("🔬 专家奖励系统测试")
    print("="*60)
    
    # Test 1: Turn-3 预判治疗
    print("\n【测试1】Turn-3 预判治疗 (+80奖励)")
    env.reset()
    
    # 模拟到Turn 3
    for i in range(2):
        action = [0, 0, 0, 0]  # 全部WAIT
        env.step(action)
    
    # Turn 3 (Cycle 2): Arthur HP降低，Ellie治疗
    env.state.arthur.current_hp = 300  # 设置到危险阈值以下
    action = [0, 0, 1, 1]  # Arthur WAIT, Merlin WAIT, Ellie治疗Arthur
    obs, reward, done, trunc, info = env.step(action)
    
    expert_r = info['reward_breakdown'].get('expert', 0)
    print(f"   Arthur HP before: 300")
    print(f"   Ellie action: Heal Arthur")
    print(f"   Expert reward: {expert_r}")
    print(f"   ✅ PASS" if expert_r >= 80 else f"   ❌ FAIL")
    
    # Test 2: Turn-4 嘲讽
    print("\n【测试2】Turn-4 嘲讽 (+100奖励)")
    env.reset()
    
    # 到Turn 4 (Cycle 3)
    for i in range(3):
        action = [0, 0, 0, 0]
        env.step(action)
    
    # Arthur嘲讽
    env.state.arthur.ap = 3
    action = [2, 0, 0, 0]  # Arthur Taunt
    obs, reward, done, trunc, info = env.step(action)
    
    expert_r = info['reward_breakdown'].get('expert', 0)
    print(f"   Boss Cycle: 3 (Execute)")
    print(f"   Arthur action: Taunt")
    print(f"   Expert reward: {expert_r}")
    print(f"   ✅ PASS" if expert_r >= 100 else f"   ❌ FAIL")
    
    # Test 3: 英雄牺牲
    print("\n【测试3】Ellie英雄牺牲 (+200奖励)")
    env.reset()
    
    env.state.arthur.current_hp = 250  # Arthur危险
    env.state.ellie.current_hp = 50    # Ellie低血
    action = [0, 0, 1, 2]  # Ellie输血给Arthur
    obs, reward, done, trunc, info = env.step(action)
    
    expert_r = info['reward_breakdown'].get('expert', 0)
    print(f"   Arthur HP: 250 (< 300)")
    print(f"   Ellie HP: 50")
    print(f"   Ellie action: Transfuse Arthur")
    print(f"   Expert reward: {expert_r}")
    print(f"   ✅ PASS" if expert_r >= 200 else f"   ❌ FAIL")
    
    # Test 4: 生存里程碑
    print("\n【测试4】生存里程碑 (Turn 4: +50)")
    env.reset()
    
    # 快速到Turn 3
    for i in range(3):
        action = [0, 0, 0, 0]
        env.step(action)
    
    # Turn 4 (Cycle 3) Arthur使用嘲讽来生存并完成里程碑
    action = [2, 0, 0, 0]
    obs, reward, done, trunc, info = env.step(action)
    
    expert_r = info['reward_breakdown'].get('expert', 0)
    print(f"   Turn: {env.state.turn}")
    print(f"   Alive count: {sum(not c.is_dead for c in [env.state.arthur, env.state.merlin, env.state.ellie])}")
    print(f"   Expert reward: {expert_r}")
    print(f"   ✅ PASS" if expert_r >= 50 else f"   ❌ FAIL")
    
    print("\n" + "="*60)
    print("✅ 专家奖励系统测试完成！")
    print("="*60)


if __name__ == "__main__":
    test_expert_rewards()
