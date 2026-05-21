"""
AP系统验证测试
"""

from rpg_boss_fight_env import RPGBossFightEnv

env = RPGBossFightEnv(render_mode="human")
obs, info = env.reset()

print("\n" + "="*60)
print("Turn 1 开始")
print("="*60)
print(f"Arthur AP: {env.state.arthur.ap}")
print(f"Merlin AP: {env.state.merlin.ap}")
print(f"Ellie AP: {env.state.ellie.ap}")

# Turn 1: 
# Arthur用Shield_Bash (1AP)
# Merlin用Soul_Burn (3AP)  
# Ellie用Heal (1AP)
action = [1, 3, 1, 1]  # Shield_Bash, Soul_Burn, Heal Arthur
obs, reward, done, trunc, info = env.step(action)

print("\n" + "="*60)
print("Turn 1 结束后（在AP恢复之前）")
print("="*60)
print(f"Arthur AP: {env.state.arthur.ap} (用了Shield_Bash 1AP, 应该剩2)")
print(f"Merlin AP: {env.state.merlin.ap} (用了Soul_Burn 3AP, 应该剩0)")
print(f"Ellie AP: {env.state.ellie.ap} (用了Heal 1AP, 应该剩2)")

# Turn 2开始（AP恢复在step()开头）
action = [0, 0, 0, 0]  # 全WAIT
obs, reward, done, trunc, info = env.step(action)

print("\n" + "="*60)
print("Turn 2 开始后（AP已恢复）")
print("="*60)
print(f"Arthur AP: {env.state.arthur.ap} (2+1=3)")
print(f"Merlin AP: {env.state.merlin.ap} (0+1=1)")
print(f"Ellie AP: {env.state.ellie.ap} (2+1=3)")

env.render()
