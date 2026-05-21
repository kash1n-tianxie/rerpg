"""
测试学术数据采集系统
验证RPGMetricsCallback是否正常工作
"""

from rpg_boss_fight_env import RPGBossFightEnv
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.monitor import Monitor
from callbacks import RPGMetricsCallback

# 创建环境
def make_env():
    env = RPGBossFightEnv()
    env = Monitor(env)
    return env

env = DummyVecEnv([make_env])

# 创建模型
model = PPO("MlpPolicy", env, verbose=0, tensorboard_log="./test_tensorboard/")

# 创建callback
metrics_callback = RPGMetricsCallback(verbose=1)

print("\n" + "="*60)
print("🔬 测试学术数据采集系统")
print("="*60)
print("训练1000步，每100个episode记录一次数据")
print("="*60 + "\n")

# 训练
model.learn(total_timesteps=1000, callback=metrics_callback)

print("\n✅ 测试完成！")
print("\n查看TensorBoard:")
print("  python3 -m tensorboard.main --logdir test_tensorboard")
print("  然后访问 http://localhost:6006/")
print("\n在SCALARS标签下，你会看到:")
print("  - custom/* : 核心性能指标")
print("  - tactical/* : 战术行为指标")
print("  - analysis/* : 高级分析指标")
