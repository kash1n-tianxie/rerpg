🌐 **[简体中文](RL_TRAINING.md)** | **[English](RL_TRAINING.en.md)** | **日本語**

---

# 🧠 強化学習の訓練と評価ガイド (RL_TRAINING)

本ガイドでは、RPG戦闘環境における強化学習（RL）の訓練および対照実験をターミナルで実行する方法を紹介します。Stable-Baselines3が提供するPPOアルゴリズムを用い、**シンプル報酬（Baseline）**と**エキスパート誘導戦術報酬（Detailed）**の2つの報酬設計下におけるエージェントの戦略的パフォーマンスを比較します。

---

## 1. 動作環境の設定

本プロジェクトの強化学習環境は Python 3.9+ に依存しています。

### 依存パッケージのインストール
プロジェクトのルートディレクトリで以下のコマンドを実行します：
```bash
pip install -r requirements.txt
```

> [!TIP]
> 依存パッケージの競合を避けるため、`conda` または `venv` を用いて独立した仮想環境を作成することを強く推奨します。

---

## 2. 対照実験の実行

異なる報酬設計のパフォーマンスを比較するため、両方のモードで訓練を実行します：

### 実験 1: 基底モデル (Baseline) の訓練
Baselineモードでは、エージェントは「ボスへのダメージ」と「生存時間」からのみ基礎的な報酬を受け取ります。これにより、戦術的な指示がない状況下でのエージェントの自己学習能力を評価します。

```bash
python3 train_baseline.py --steps 100000 --name ppo_baseline_100k
```
* `--steps`: 訓練ステップ数（デフォルト 100k。対照実験を行う際は、ステップ数を統一することを推奨します）。
* `--name`: TensorBoardのログディレクトリ名を指定します。
* 訓練済みモデルは `models/baseline_ppo.zip` に保存されます。

### 実験 2: 戦術誘導モデル (Detailed) の訓練
Detailedモードでは、人間が設計したエキスパート報酬（例：「凝視ターン前のタンク回復への誘導報酬」、「処刑ターンでのArthurの嘲諷成功報酬」など）が含まれます。

```bash
python3 train_rl.py --steps 100000 --name ppo_detailed_100k
```
* 訓練済みモデルは `models/rpg_boss_ppo.zip` に保存されます。

---

## 3. TensorBoardによる訓練プロセスの監視

本プロジェクトには、カスタムコールバック `callbacks.py`（`RPGMetricsCallback`）が統合されており、訓練中の詳細なパフォーマンス指標をリアルタイムで記録します。

### TensorBoardの起動
プロジェクトのルートディレクトリで以下のコマンドを実行します：
```bash
python3 -m tensorboard.main --logdir tensorboard_logs --port 6006
```
ブラウザで [http://localhost:6006](http://localhost:6006) を開きます。

### コア指標の解説
TensorBoard上で、以下の学術的な評価指標を追跡・分析できます：

| パネルカテゴリ | 指標名 | 指標の説明 | 学術的な意義 |
| :--- | :--- | :--- | :--- |
| **custom/** | `custom/total_damage_mean` | 平均累積ダメージ/エピソード | エージェントのコアとなる攻撃効率を評価します。 |
| **custom/** | `custom/survival_turns_mean` | 平均生存ターン数/エピソード | タンクと回復の防衛連携の成功率を評価します。 |
| **tactical/** | `tactical/self_destruct_rate` | Arthurの自爆スキル使用率 | 利他的な自己犠牲戦略の創発を観察します。 |
| **tactical/** | `tactical/taunt_per_episode` | 嘲諷スキルの使用頻度 | ボスの即死攻撃に対する防衛メカニクスの習熟度を測定します。 |
| **key_metrics/**| `key_metrics/team_synergy` | 回復とダメージの比率 | 生存優先と攻撃優先の戦略バランスを反映します。 |

---

## 4. エージェントの評価と対局リプレイ

訓練完了後、確定的なポリシー（Deterministic Policy）を用いてエージェントを評価し、または最良の戦闘リプレイを再生できます。

### エージェントの性能評価
探索時のランダム性を排除した決定論的ポリシー下でモデルをテストし、安定した勝率や平均値を算出します：
```bash
# Baseline エージェントの評価
python3 train_rl.py --eval --model models/baseline_ppo

# Detailed エージェントの評価
python3 train_rl.py --eval --model models/rpg_boss_ppo
```

### 最良エピソードのリプレイ
`replay_best.py` スクリプトを実行すると、訓練済みモデルをロードし、ターミナル上にターンごとのJRPG戦闘データをクリアに出力します：
```bash
python3 replay_best.py
```
> [!NOTE]
> このスクリプトは、自動的に最良のモデル（デフォルトは `models/rpg_boss_ppo`）をロードして1エピソード実行します。AIのミクロな意思決定フローの検証に有効です。
