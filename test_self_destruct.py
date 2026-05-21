"""
测试Self-Destruct公式（正确版本）
验证：自爆 = BOSS已受伤害 * 25%
"""

from rpg_boss_fight_env import RPGBossFightEnv

env = RPGBossFightEnv(render_mode="human")

print("\n" + "="*70)
print("🧪 Self-Destruct公式测试（BOSS损失HP版本）")
print("="*70)

env.reset()

# 先造成一些伤害
env.state.total_damage_dealt = 1000  # BOSS受到1000伤害
env.state.arthur.current_hp = 250  # Arthur只剩250 HP
env.state.arthur.ap = 3

print(f"\n设置:")
print(f"  BOSS已受伤害: {env.state.total_damage_dealt}")
print(f"  Arthur当前HP: {env.state.arthur.current_hp}/450")

# Arthur自爆
damage_before = env.state.total_damage_dealt
action = [3, 0, 0, 0]  # Self-Destruct
_, _, _, _, _ = env.step(action)

self_destruct_damage = env.state.total_damage_dealt - damage_before
expected_damage = int(1000 * 0.25)  # 1000 * 25% = 250

print(f"\n结果:")
print(f"  预期自爆伤害: {expected_damage} (BOSS损失1000 * 25%)")
print(f"  实际自爆伤害: {self_destruct_damage}")

if self_destruct_damage == expected_damage:
    print(f"\n  ✅ PASS: 公式正确！")
else:
    print(f"\n  ❌ FAIL: 公式错误")

print("="*70)
