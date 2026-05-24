#!/usr/bin/env python3
"""
TensorBoard 数据提取与对比绘图脚本
自动从 tensorboard_logs 目录提取 Baseline 与 Detailed 模式的训练数据，
并使用 Matplotlib 绘制学术论文级别的对比图表（保存为 assets/tensorboard_comparison.png）。
"""

import os
import glob
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from tensorboard.backend.event_processing import event_accumulator

# 设置中英文字体和图表样式，使其看起来专业学术
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Heiti TC', 'PingFang SC', 'SimHei']
plt.rcParams['axes.unicode_minus'] = False
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

def extract_scalar_from_events(log_dir, tag):
    """从指定的 TensorBoard 运行目录中提取特定 Tag 的 Scalar 数据"""
    event_files = glob.glob(os.path.join(log_dir, "events.out.tfevents.*"))
    if not event_files:
        print(f"⚠️  警告: 在 {log_dir} 中未找到事件文件。")
        return None
    
    # 按照修改时间排序，使用最新的那个
    event_file = max(event_files, key=os.path.getmtime)
    print(f"📖 正在解析事件文件: {os.path.basename(event_file)}")
    
    # 只加载 Scalar 数据以加快加载速度
    ea = event_accumulator.EventAccumulator(
        event_file,
        size_guidance={event_accumulator.SCALARS: 1000}
    )
    ea.Reload()
    
    tags = ea.Tags().get('scalars', [])
    if tag not in tags:
        # 尝试查找相似的 tag
        matching_tags = [t for t in tags if tag.split('/')[-1] in t]
        if matching_tags:
            tag = matching_tags[0]
            print(f"   自动匹配到相似 Tag: {tag}")
        else:
            return None
            
    events = ea.Scalars(tag)
    steps = [e.step for e in events]
    values = [e.value for e in events]
    
    return pd.DataFrame({'step': steps, tag: values})

def smooth_curve(values, weight=0.85):
    """指数移动平均平滑，使趋势线在学术图表中更清晰"""
    last = values[0]
    smoothed = []
    for val in values:
        if np.isnan(val):
            smoothed.append(last)
            continue
        smoothed_val = last * weight + (1 - weight) * val
        smoothed.append(smoothed_val)
        last = smoothed_val
    return smoothed

def main():
    log_dir_root = "tensorboard_logs"
    if not os.path.exists(log_dir_root):
        print(f"❌ 错误: 目录 {log_dir_root} 不存在。请确保您运行过训练。")
        return
    
    # 查找所有的 runs
    all_runs = [d for d in os.listdir(log_dir_root) if os.path.isdir(os.path.join(log_dir_root, d))]
    
    baseline_dirs = []
    detailed_dirs = []
    
    for run in all_runs:
        run_lower = run.lower()
        full_path = os.path.join(log_dir_root, run)
        if "baseline" in run_lower:
            baseline_dirs.append(full_path)
        elif "detailed" in run_lower or "ppo" in run_lower:
            detailed_dirs.append(full_path)
            
    # 如果没找到，按默认排序分组
    if not baseline_dirs and not detailed_dirs and len(all_runs) >= 2:
        baseline_dirs = [os.path.join(log_dir_root, all_runs[0])]
        detailed_dirs = [os.path.join(log_dir_root, all_runs[1])]
        print(f"⚠️  未检测到包含 'baseline' 或 'detailed' 关键词的目录，默认分配：\nBaseline: {all_runs[0]}\nDetailed: {all_runs[1]}")
        
    if not baseline_dirs and not detailed_dirs:
        print("❌ 错误: 未能在 tensorboard_logs 中找到有效的训练运行记录。")
        return

    # 指定要提取的两个核心学术指标
    tag_damage = "custom/total_damage_mean"
    tag_turns = "custom/survival_turns_mean"
    
    print("\n📊 [开始提取 Baseline 数据] ...")
    df_base_dmg = extract_scalar_from_events(baseline_dirs[0], tag_damage) if baseline_dirs else None
    df_base_trn = extract_scalar_from_events(baseline_dirs[0], tag_turns) if baseline_dirs else None
    
    print("\n📊 [开始提取 Detailed 数据] ...")
    df_det_dmg = extract_scalar_from_events(detailed_dirs[0], tag_damage) if detailed_dirs else None
    df_det_trn = extract_scalar_from_events(detailed_dirs[0], tag_turns) if detailed_dirs else None
    
    # 绘图逻辑
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # 1. 绘制伤害对比图 (DPE)
    ax1.set_title("Episodic Cumulative Damage (DPE) Comparison", fontsize=13, fontweight='bold', pad=15)
    ax1.set_xlabel("Training Steps", fontsize=11)
    ax1.set_ylabel("Mean Damage Dealt", fontsize=11)
    
    oracle_value = 5037.0
    ax1.axhline(y=oracle_value, color='black', linestyle='--', linewidth=1.5, label=f"DP Oracle Max Limit ({oracle_value})")
    
    if df_base_dmg is not None:
        steps = df_base_dmg['step']
        raw = df_base_dmg[tag_damage]
        ax1.plot(steps, raw, color='#1f77b4', alpha=0.2, label='Baseline (Raw)')
        ax1.plot(steps, smooth_curve(raw), color='#1f77b4', linewidth=2.5, label='Baseline (Smoothed)')
        
    if df_det_dmg is not None:
        steps = df_det_dmg['step']
        raw = df_det_dmg[tag_damage]
        ax1.plot(steps, raw, color='#ff7f0e', alpha=0.2, label='Detailed (Raw)')
        ax1.plot(steps, smooth_curve(raw), color='#ff7f0e', linewidth=2.5, label='Detailed (Smoothed)')
        
    ax1.grid(True, linestyle=':', alpha=0.6)
    ax1.legend(loc='lower right', frameon=True, facecolor='white', framealpha=0.9)
    
    # 2. 绘制生存回合对比图 (ST)
    ax2.set_title("Survival Turns (ST) Comparison", fontsize=13, fontweight='bold', pad=15)
    ax2.set_xlabel("Training Steps", fontsize=11)
    ax2.set_ylabel("Mean Survival Turns", fontsize=11)
    
    max_turns = 50
    ax2.axhline(y=max_turns, color='red', linestyle=':', linewidth=1.2, label=f"Maximum Turns Limit ({max_turns})")
    
    if df_base_trn is not None:
        steps = df_base_trn['step']
        raw = df_base_trn[tag_turns]
        ax2.plot(steps, raw, color='#2ca02c', alpha=0.2, label='Baseline (Raw)')
        ax2.plot(steps, smooth_curve(raw), color='#2ca02c', linewidth=2.5, label='Baseline (Smoothed)')
        
    if df_det_trn is not None:
        steps = df_det_trn['step']
        raw = df_det_trn[tag_turns]
        ax2.plot(steps, raw, color='#d62728', alpha=0.2, label='Detailed (Raw)')
        ax2.plot(steps, smooth_curve(raw), color='#d62728', linewidth=2.5, label='Detailed (Smoothed)')
        
    ax2.grid(True, linestyle=':', alpha=0.6)
    ax2.legend(loc='lower right', frameon=True, facecolor='white', framealpha=0.9)
    
    plt.tight_layout()
    
    # 确保 assets 目录存在
    os.makedirs("assets", exist_ok=True)
    out_path = "assets/tensorboard_comparison.png"
    plt.savefig(out_path, dpi=300)
    print(f"\n🎉 绘图成功！图表已保存至: {out_path}")

if __name__ == "__main__":
    main()
