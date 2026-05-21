"""
基准奖励模式训练脚本
用于对比实验：简单基准奖励 vs 详细战术奖励
"""

import os
import time
import argparse
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import CallbackList, BaseCallback
from stable_baselines3.common.monitor import Monitor

# 使用baseline模式的环境
from rpg_boss_fight_env import RPGBossFightEnv
from callbacks import RPGMetricsCallback


class ProgressCallback(BaseCallback):
    """训练进度回调 - 追踪最高伤害"""
    def __init__(self, check_freq=2000, verbose=1):
        super().__init__(verbose)
        self.check_freq = check_freq
        self.best_damage = 0
        self.n_calls = 0
    
    def _on_step(self) -> bool:
        self.n_calls += 1
        
        # 每check_freq步检查一次
        if self.n_calls % self.check_freq == 0:
            # 获取最近的episode信息
            if hasattr(self.model, 'ep_info_buffer') and len(self.model.ep_info_buffer) > 0:
                # 转换为list以支持切片
                ep_buffer_list = list(self.model.ep_info_buffer)
                recent_damages = [ep_info.get("total_damage", 0) 
                                for ep_info in ep_buffer_list[-100:]]
                if recent_damages:
                    avg_damage = np.mean(recent_damages)
                    max_damage = max(recent_damages)
                    
                    if max_damage > self.best_damage:
                        self.best_damage = max_damage
                        print(f"\n🎯 新纪录! Episode {len(ep_buffer_list)}: {max_damage} 伤害")
                    
                    if self.verbose > 0 and self.n_calls % (self.check_freq * 5) == 0:
                        print(f"\n{'='*60}")
                        print(f"Steps: {self.n_calls}")
                        print(f"Episodes: {len(ep_buffer_list)}")
                        print(f"最近100局平均伤害: {avg_damage:.1f}")
                        print(f"最近100局最高伤害: {max_damage:.0f}")
                        print(f"历史最高伤害: {self.best_damage:.0f}")
                        print(f"{'='*60}\n")
        
        return True



def train_baseline_agent(
    total_timesteps: int = 100000,
    learning_rate: float = 3e-4,
    model_save_path: str = "models/baseline_ppo",
    tensorboard_log: str = "./tensorboard_logs/",
    run_name: str = None
):
    """
    训练使用基准奖励的RL智能体
    
    Args:
        total_timesteps: 总训练步数
        learning_rate: 学习率
        model_save_path: 模型保存路径
        tensorboard_log: TensorBoard日志路径
        run_name: TensorBoard run名称
    """
    
    print("\n" + "="*60)
    print("🚀 开始训练 - BASELINE奖励模式")
    print("="*60)
    print(f"算法: PPO (Proximal Policy Optimization)")
    print(f"总步数: {total_timesteps:,}")
    print(f"学习率: {learning_rate}")
    print(f"模型保存路径: {model_save_path}")
    print(f"⚠️  奖励模式: BASELINE (无战术奖励)")
    if run_name:
        print(f"📝 TensorBoard Run 名称: {run_name}")
    print("="*60 + "\n")
    
    # 创建保存目录
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    os.makedirs(tensorboard_log, exist_ok=True)
    
    # 创建环境 - 使用baseline模式
    print("🎮 创建环境 (BASELINE奖励模式)...")
    env = RPGBossFightEnv(reward_mode="baseline")
    env = Monitor(env)
    
    # 创建PPO模型
    print("🤖 创建PPO模型...")
    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=learning_rate,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        verbose=1,
        tensorboard_log=tensorboard_log,
        policy_kwargs=dict(
            net_arch=[256, 256, 128]
        )
    )
    
    # 创建回调
    progress_callback = ProgressCallback(check_freq=2000, verbose=1)
    metrics_callback = RPGMetricsCallback(verbose=1)
    callback_list = CallbackList([progress_callback, metrics_callback])
    
    # 开始训练
    print("⏳ 训练中...\n")
    start_time = time.time()
    
    try:
        model.learn(
            total_timesteps=total_timesteps,
            callback=callback_list,
            progress_bar=True,
            tb_log_name=run_name if run_name else "BASELINE"
        )
    except KeyboardInterrupt:
        print("\n⚠️  训练被中断")
    
    training_time = time.time() - start_time
    
    # 保存模型
    model.save(model_save_path)
    print(f"\n✅ 模型已保存到: {model_save_path}")
    print(f"⏱️  训练用时: {training_time/60:.1f} 分钟")
    
    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="训练基准奖励模式的RPG Boss Fight Agent")
    parser.add_argument("--steps", type=int, default=100000, help="训练总步数")
    parser.add_argument("--lr", type=float, default=3e-4, help="学习率")
    parser.add_argument("--model", type=str, default="models/baseline_ppo", help="模型保存路径")
    parser.add_argument("--name", type=str, default="baseline", help="TensorBoard run名称")
    
    args = parser.parse_args()
    
    # 训练
    train_baseline_agent(
        total_timesteps=args.steps,
        learning_rate=args.lr,
        model_save_path=args.model,
        run_name=args.name
    )
    
    print("\n💡 提示:")
    print(f"  - 使用 'python3 train_rl.py --eval --model {args.model}' 评估基准模型")
    print(f"  - 使用 'tensorboard --logdir tensorboard_logs' 查看训练对比")
    print(f"  - 对比: baseline vs detailed 的学习曲线")
