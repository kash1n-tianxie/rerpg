"""
测试游戏逻辑修复
验证：1. Taunt时机 2. Self-Destruct公式 3. Transfuse限制 4. Boss Execute逻辑
"""

from rpg_boss_fight_env import RPGBossFightEnv
import numpy as np

env = RPGBossFightEnv(render_mode="human")

print("\n" + "="*70)
print("🧪 游戏逻辑测试")
print("="*70)

# ========== 测试1: Taunt在Cycle 3的正确性 ==========
print("\n【测试1】Taunt应该保护被Gaze标记的目标")
print("-" * 70)

env.reset()

# 手动设置到Cycle 2
env.state.boss_cycle = 2
env.state.turn = 3

# 模拟Gaze会标记HP最低者（设置为Merlin）
env.state.merlin.current_hp = 50  # 最低HP
env.state.arthur.current_hp = 450
env.state.ellie.current_hp = 250

# Cycle 2: Gaze
print(f"\nCycle 2 - Boss Gaze:")
print(f"  Merlin HP最低: {env.state.merlin.current_hp}")

# 执行一个wait action让Boss行动
action = [0, 0, 0, 0]  # 全WAIT
_, _, _, _, _ = env.step(action)

# 检查Merlin是否被标记
assert env.state.merlin.is_gazed, "❌ Merlin应该被Gaze标记！"
print(f"  ✅ Merlin被标记(Gazed)")

# 下一回合Cycle 3: Execute
# Arthur使用Taunt
print(f"\nCycle 3 - Arthur Taunt + Boss Execute:")
env.state.arthur.ap = 3
action = [2, 0, 0, 0]  # Arthur Taunt
_, _, _, _, _ = env.step(action)

# Merlin应该存活（因为Arthur嘲讽了）
if not env.state.merlin.is_dead and env.state.arthur.current_hp < 450:
    print(f"  ✅ PASS: Arthur替Merlin承受Execute ({env.state.arthur.current_hp}/450 HP)")
    print(f"  ✅ PASS: Merlin存活 ({env.state.merlin.current_hp}/200 HP)")
else:
    print(f"  ❌ FAIL: Merlin死亡 or Arthur未受伤")

# ========== 测试2: Self-Destruct公式 ==========
print("\n【测试2】Self-Destruct应该 = 损失HP * 25%")
print("-" * 70)

env.reset()

# 设置Arthur受到伤害
env.state.arthur.current_hp = 250  # 损失200 HP
env.state.arthur.max_hp = 450
env.state.arthur.ap = 3

# 记录自爆前伤害
damage_before = env.state.total_damage_dealt

# Arthur自爆
action = [3, 0, 0, 0]  # Self-Destruct
_, _, _, _, _ = env.step(action)

damage_after = env.state.total_damage_dealt
self_destruct_damage = damage_after - damage_before

expected_damage = int((450 - 250) * 0.25)  # (450-250) * 25% = 50

print(f"  Arthur损失HP: {450 - 250}")
print(f"  预期自爆伤害: {expected_damage}")
print(f"  实际自爆伤害: {self_destruct_damage}")

if self_destruct_damage == expected_damage:
    print(f"  ✅ PASS: 自爆公式正确")
else:
    print(f"  ❌ FAIL: 公式错误 (应该是{expected_damage})")

# ========== 测试3: Transfuse不能对自己 ==========
print("\n【测试3】Transfuse不能对自己使用")
print("-" * 70)

env.reset()

env.state.ellie.current_hp = 100
env.state.ellie.ap = 3

# 尝试对自己使用Transfuse
action = [0, 0, 3, 2]  # Ellie target=3 (self), skill=2 (Transfuse)
_, reward, _, _, _ = env.step(action)

# 应该有惩罚且Ellie HP不变
if env.state.ellie.current_hp == 100 and reward < 0:
    print(f"  ✅ PASS: Transfuse自己被阻止，惩罚 {reward}")
else:
    print(f"  ❌ FAIL: Transfuse自己成功了")

# ========== 测试4: Taunt后立即失效 ==========
print("\n【测试4】Taunt应该在Boss行动后立即失效")
print("-" * 70)

env.reset()

env.state.boss_cycle = 0  # Random Attack
env.state.arthur.ap = 3

# Arthur Taunt
action = [2, 0, 0, 0]
_, _, _, _, _ = env.step(action)

# Boss行动后，Taunt应该失效
if not env.state.arthur.has_taunt:
    print(f"  ✅ PASS: Boss行动后Taunt已清除")
else:
    print(f"  ❌ FAIL: Taunt仍然存在")

print("\n" + "="*70)
print("✅ 游戏逻辑测试完成")
print("="*70)
