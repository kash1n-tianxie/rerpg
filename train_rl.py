"""
RPG Boss Fight RL训练脚本
使用PPO算法训练智能体学习极限战术
集成学术论文数据采集
"""

import os
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, EvalCallback, CallbackList
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv
from rpg_boss_fight_env import RPGBossFightEnv
from callbacks import RPGMetricsCallback  # 学术数据采集
import time


class ProgressCallback(BaseCallback):
    """自定义回调：监控训练进度"""
    
    def __init__(self, check_freq: int = 1000, verbose: int = 1):
        super().__init__(verbose)
        self.check_freq = check_freq
        self.best_damage = 0
        self.episode_damages = []
        self.episode_count = 0
    
    def _on_step(self) -> bool:
        # 检查是否有episode结束
        if self.locals.get("dones")[0]:
            info = self.locals.get("infos")[0]
            damage = info.get("total_damage", 0)
            self.episode_damages.append(damage)
            self.episode_count += 1
            
            if damage > self.best_damage:
                self.best_damage = damage
                if self.verbose > 0:
                    print(f"\n🎯 新纪录! Episode {self.episode_count}: {damage} 伤害")
        
        # 定期报告
        if self.num_timesteps % self.check_freq == 0 and len(self.episode_damages) > 0:
            recent = self.episode_damages[-100:] if len(self.episode_damages) >= 100 else self.episode_damages
            avg_damage = np.mean(recent)
            max_damage = np.max(recent)
            
            print(f"\n{'='*60}")
            print(f"Steps: {self.num_timesteps}")
            print(f"Episodes: {self.episode_count}")
            print(f"最近100局平均伤害: {avg_damage:.1f}")
            print(f"最近100局最高伤害: {max_damage:.0f}")
            print(f"历史最高伤害: {self.best_damage}")
            print(f"{'='*60}")
        
        return True


def make_env():
    """创建环境"""
    env = RPGBossFightEnv()
    env = Monitor(env)  # 包装用于记录
    return env


def train_agent(
    total_timesteps: int = 100000,
    learning_rate: float = 3e-4,
    model_save_path: str = "models/rpg_boss_ppo",
    tensorboard_log: str = "./tensorboard_logs/",
    resume: bool = False,
    run_name: str = None  # 新增：自定义run名称
):
    """
    训练RL智能体
    
    参数:
        total_timesteps: 总训练步数
        learning_rate: 学习率
        model_save_path: 模型保存路径
        tensorboard_log: TensorBoard日志路径
        resume: 是否继续训练现有模型
        run_name: TensorBoard日志的run名称
    """
    
    print("\n" + "="*60)
    print("🚀 开始训练 RPG Boss Fight Agent")
    print("="*60)
    print(f"算法: PPO (Proximal Policy Optimization)")
    print(f"总步数: {total_timesteps:,}")
    print(f"学习率: {learning_rate}")
    print(f"模型保存路径: {model_save_path}")
    print(f"📊 启用学术数据采集 (Thesis Metrics)")
    if resume:
        print(f"🔄 续训模式: 加载现有模型继续训练")
    if run_name:
        print(f"📝 TensorBoard Run 名称: {run_name}")
    print("="*60 + "\n")
    
    # 创建保存目录
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    os.makedirs(tensorboard_log, exist_ok=True)
    
    # 创建环境
    env = DummyVecEnv([make_env])
    
    # 检查是否续训
    model_file = f"{model_save_path}.zip"
    if resume and os.path.exists(model_file):
        print(f"📂 加载现有模型: {model_file}")
        model = PPO.load(
            model_save_path, 
            env=env,
            tensorboard_log=tensorboard_log
        )
        print("✅ 模型加载成功，继续训练！\n")
    else:
        if resume:
            print(f"⚠️  未找到现有模型 {model_file}，创建新模型")
        
        # 创建新PPO模型
        model = PPO(
            "MlpPolicy",
            env,
            learning_rate=learning_rate,
            n_steps=2048,           # 每次更新收集的步数
            batch_size=64,          # 小批量大小
            n_epochs=10,            # 每次更新的epoch数
            gamma=0.99,             # 折扣因子
            gae_lambda=0.95,        # GAE lambda
            clip_range=0.2,         # PPO裁剪范围
            ent_coef=0.01,          # 熵系数（鼓励探索）
            vf_coef=0.5,            # 价值函数系数
            max_grad_norm=0.5,      # 梯度裁剪
            verbose=1,
            tensorboard_log=tensorboard_log,
            policy_kwargs=dict(
                net_arch=[256, 256, 128]  # 网络架构
            )
        )
    
    # ========== 创建回调列表 ==========
    progress_callback = ProgressCallback(check_freq=2000, verbose=1)
    metrics_callback = RPGMetricsCallback(verbose=1)  # 学术数据采集
    
    # 组合多个callback
    callback_list = CallbackList([progress_callback, metrics_callback])
    
    # 开始训练
    print("⏳ 训练中...\n")
    start_time = time.time()
    
    try:
        model.learn(
            total_timesteps=total_timesteps,
            callback=callback_list,  # 使用组合callback
            progress_bar=True,
            reset_num_timesteps=not resume,  # 续训时不重置计数器
            tb_log_name=run_name if run_name else "PPO"  # 自定义run名称
        )
    except KeyboardInterrupt:
        print("\n⚠️  训练被中断")
    
    training_time = time.time() - start_time
    
    # 保存模型
    model.save(model_save_path)
    print(f"\n✅ 模型已保存到: {model_save_path}")
    print(f"⏱️  训练用时: {training_time/60:.1f} 分钟")
    
    return model, progress_callback


def evaluate_agent(model, num_episodes: int = 10, render: bool = True):
    """
    评估训练好的智能体
    
    参数:
        model: 训练好的模型
        num_episodes: 评估回合数
        render: 是否渲染
    """
    print("\n" + "="*60)
    print(f"🎮 评估智能体 ({num_episodes} 回合)")
    print("="*60 + "\n")
    
    env = RPGBossFightEnv(render_mode="human" if render else None)
    
    damages = []
    turns = []
    
    for episode in range(num_episodes):
        obs, info = env.reset()
        episode_damage = 0
        episode_turns = 0
        done = False
        
        print(f"\n{'#'*60}")
        print(f"Episode {episode + 1}/{num_episodes}")
        print(f"{'#'*60}")
        
        while not done:
            # 使用训练好的策略（确定性）
            action, _states = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            
            if render:
                env.render()
            
            if done:
                episode_damage = info.get("total_damage", 0)
                episode_turns = info.get("turn", 0)
        
        damages.append(episode_damage)
        turns.append(episode_turns)
        
        print(f"\n📊 Episode {episode + 1} 结果:")
        print(f"   总伤害: {episode_damage}")
        print(f"   回合数: {episode_turns}")
        print(f"   平均DPT: {episode_damage/episode_turns:.1f}")
    
    # 统计
    print("\n" + "="*60)
    print("📈 评估结果统计")
    print("="*60)
    print(f"平均伤害: {np.mean(damages):.1f}")
    print(f"最高伤害: {np.max(damages):.0f}")
    print(f"最低伤害: {np.min(damages):.0f}")
    print(f"标准差: {np.std(damages):.1f}")
    print(f"平均回合: {np.mean(turns):.1f}")
    print("="*60 + "\n")
    
    return damages, turns


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="训练RPG Boss Fight RL Agent")
    parser.add_argument("--steps", type=int, default=100000, help="训练总步数")
    parser.add_argument("--lr", type=float, default=3e-4, help="学习率")
    parser.add_argument("--eval", action="store_true", help="只评估现有模型")
    parser.add_argument("--model", type=str, default="models/rpg_boss_ppo", help="模型路径")
    parser.add_argument('--resume', action='store_true', 
                       help='继续训练现有模型')
    parser.add_argument('--name', type=str, default=None,
                       help='TensorBoard run名称（用于对比实验）')
    
    args = parser.parse_args()
    
    if args.eval:
        # 只评估
        print("📂 加载模型...")
        model = PPO.load(args.model)
        evaluate_agent(model, num_episodes=10, render=True)
    else:
        # 训练
        model, callback = train_agent(
            total_timesteps=args.steps,
            learning_rate=args.lr,
            model_save_path=args.model,
            resume=args.resume,
            run_name=args.name  # 传递run名称
        )
        
        # 训练后评估
        print("\n🎯 训练完成！开始评估...")
        evaluate_agent(model, num_episodes=5, render=True)
        
        print("\n💡 提示:")
        print(f"  - 使用 'python3 train_rl.py --eval' 来评估当前模型")
        print(f"  - 使用 'python3 train_rl.py --resume --steps 50000' 继续训练")
        print(f"  - 使用 'tensorboard --logdir tensorboard_logs' 查看训练曲线")
        print(f"  - 模型已保存到: {args.model}.zip")
