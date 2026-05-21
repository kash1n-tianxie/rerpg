"""
测试Pray (群体治疗) 技能
"""

from rpg_boss_fight_env import RPGBossFightEnv

env = RPGBossFightEnv(render_mode="human")

print("\n" + "="*60)
print("🔬 测试Pray (群体治疗) 技能")
print("="*60)

# 测试1: Boss Cycle 1使用Pray
print("\n【测试1】Boss Cycle 1 使用Pray (应有+60奖励)")
env.reset()

# 到Cycle 1
env.step([0, 0, 0, 0])  # Turn 1

# 降低全队HP
env.state.arthur.current_hp = 350
env.state.merlin.current_hp = 130
env.state.ellie.current_hp = 180

print(f"\nCycle: {env.state.boss_cycle}")
print(f"Team HP: Arthur {env.state.arthur.current_hp}, Merlin {env.state.merlin.current_hp}, Ellie {env.state.ellie.current_hp}")

# Ellie使用Pray
action = [0, 0, 0, 3]  # Ellie Pray
obs, reward, done, trunc, info = env.step(action)

print(f"\n使用Pray后:")
print(f"Team HP: Arthur {env.state.arthur.current_hp}, Merlin {env.state.merlin.current_hp}, Ellie {env.state.ellie.current_hp}")
print(f"Expert reward: {info['reward_breakdown'].get('expert', 0)}")
print(f"✅ PASS" if info['reward_breakdown'].get('expert', 0) >= 60 else "❌ FAIL")

# 测试2: 全队低血使用Pray
print("\n【测试2】全队低血使用Pray (应有+80奖励)")
env.reset()

# 设置全队低血
env.state.arthur.current_hp = 200  # 44%
env.state.merlin.current_hp = 80   # 40%
env.state.ellie.current_hp = 100   # 40%
avg_hp = (200/450 + 80/200 + 100/250) / 3
print(f"\n全队平均HP: {avg_hp*100:.1f}%")
print(f"Team HP: Arthur {env.state.arthur.current_hp}, Merlin {env.state.merlin.current_hp}, Ellie {env.state.ellie.current_hp}")

# Ellie使用Pray
action = [0, 0, 0, 3]
obs, reward, done, trunc, info = env.step(action)

print(f"\n使用Pray后:")
print(f"Team HP: Arthur {env.state.arthur.current_hp}, Merlin {env.state.merlin.current_hp}, Ellie {env.state.ellie.current_hp}")
print(f"Expert reward: {info['reward_breakdown'].get('expert', 0)}")
print(f"✅ PASS" if info['reward_breakdown'].get('expert', 0) >= 80 else "❌ FAIL")

print("\n" + "="*60)
print("✅ Pray测试完成！")
print("="*60)
