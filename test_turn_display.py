"""快速测试Turn 1显示"""
from rpg_boss_fight_env import RPGBossFightEnv
from replay_best import EpisodeRecorder
import numpy as np

env = RPGBossFightEnv()
recorder = EpisodeRecorder(env)

obs, info = env.reset()
print(f"Reset: Turn {env.state.turn}, Cycle {env.state.boss_cycle}")

# Turn 1
action = np.array([0, 0, 0, 0])
obs, reward, _, _, info = env.step(action)
recorder.record_turn(action, reward, info)

# Turn 2  
action = np.array([0, 0, 0, 0])
obs, reward, _, _, info = env.step(action)
recorder.record_turn(action, reward, info)

# 检查录制
for log in recorder.turn_logs:
    print(f"Turn {log.turn}: Cycle {log.boss_cycle} ({log.boss_cycle_name})")
