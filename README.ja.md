🌐 **[简体中文](README.md)** | **[English](README.en.md)** | **日本語**

---

# 🎮 RPG Boss Fight — AI協調と戦術進化に関する研究プロジェクト (rerpg)

> **本卒業研究プロジェクトは、高ストレスかつ極めてリソースが制限されたRPG戦闘環境において、大規模言語モデル（LLMs）、強化学習（RL）、および人間プレイヤーの意思決定パフォーマンス、脆弱性パターン、そして協調戦略の創発を比較評価することを目的としています。**

---

## 📌 プロジェクトの背景と研究価値

自動運転における衝突回避、緊急医療トリアージ、金融危機下での自動取引などの現実世界のシナリオでは、AIエージェントはしばしば**「絶対的な失敗が許されず、かつ極めてリソースが限定された極限状態」**での意思決定に直面します。

本研究では、3対1のドット絵JRPG戦闘システム（ボスは999ダメージの即死級「処刑（Execute）」スキルを放つ）を構築し、制御可能な**「意思決定ストレス評価システム」**として、異なる知能システムの意思決定特性を評価します：

* 🤖 **LLMs (Gemini 2.5)**：強力な論理的推論と戦術の言語化能力を持ちますが、長いコンテキストや複雑な数値計算の下では「計算の幻覚（Arithmetic Hallucinations）」や「記憶の減退」を引き起こしやすい特徴があります。
* 🧠 **強化学習 (PPO)**：高頻度で極めて正確な行動実行力を持ちますが、密な報酬（Dense Reward）設計の下では「報酬ハッキング（Reward Hacking）」に脆弱です。一方、疎な報酬（Sparse/Minimalist Reward）の下では、「自己犠牲的な自爆」といった驚くべき大域的最適戦略を自発的に創発します。
* 👤 **人間プレイヤー**：直感的で優れた適応能力と非線形な戦略的思考を持ちますが、即死処刑の心理的圧迫下では注意が逸れ、AP消費の計算ミス（例：残り1 APの誤算）などの操作ミスを誘発しやすい傾向があります。

---

## 📁 ディレクトリ構造

```
rerpg/
├── rpg_boss_fight_env.py   # GymベースのカスタムRPG戦闘環境
├── train_rl.py             # 強化学習（Detailed戦術報酬モード）訓練スクリプト
├── train_baseline.py       # 強化学習（Baselineシンプル報酬モード）訓練スクリプト
├── callbacks.py            # 学術向けデータ収集＆TensorBoardロガー
├── test_env.py             # 環境動作テストスクリプト
├── test_expert_rewards.py  # エキスパート報酬の検証スクリプト
├── test_exploit_fixes.py   # 脆弱性検知テストスクリプト
├── max_damage_calc.py      # 動的計画法（DP）による理論上最大累積ダメージ計算機（オラクル）
├── requirements.txt        # Python依存パッケージ一覧
│
├── App.tsx                 # フロントエンド（Vite + React）戦闘画面＆戦術端末
├── services/
│   └── geminiService.ts    # Google Gemini APIのラッパー
│
├── docs/                   # 🎓 学術・操作詳細ドキュメント
│   ├── GAMEPLAY.ja.md         # 1. ゲームメカニクスと戦術詳細（JRPGルール）
│   ├── RL_TRAINING.ja.md      # 2. 強化学習の訓練と評価ガイド
│   ├── DEPLOYMENT_GUIDE.ja.md # 3. フロントエンドの起動とデプロイガイド
│   ├── RESEARCH_GUIDE.ja.md   # 4. 卒業論文向け科学的実験ガイド
│   └── MAX_DAMAGE_ANALYSIS.ja.md # 5. DPにより証明された最大ダメージ理論限界
└── README.ja.md            # 本ドキュメント
```

---

## 🚀 クイックスタート

### 1. Python強化学習環境の起動

#### 1.1 依存ライブラリのインストール
Python仮想環境（condaやvenvなど）の利用を推奨します：
```bash
pip install -r requirements.txt
```

#### 1.2 強化学習の対照実験訓練の開始
```bash
# Baseline（シンプル報酬、10万ステップ）の実行
python3 train_baseline.py --steps 100000 --name PPO_Baseline

# Detailed（戦術誘導エキスパート報酬、10万ステップ）の実行
python3 train_rl.py --steps 100000 --name PPO_Detailed
```

#### 1.3 学術指標の監視 (TensorBoard)
```bash
python3 -m tensorboard.main --logdir tensorboard_logs --port 6006
# ブラウザで http://localhost:6006 を開く
```

#### 1.4 最良エージェントの対局リプレイ
```bash
python3 replay_best.py
```

#### 1.5 理論上の最大累積ダメージの算出 (DP証明)
```bash
python3 max_damage_calc.py --states 40000 --turns 50
```
* 約60秒で動作し、50ターン制限下における**5037.0点**の絶対物理累積ダメージ限界を算出します。これは意思決定効率を評価するための「オラクル基準（Oracle Baseline）」として機能します。

---

### 2. フロントエンドの起動

#### 2.1 Node依存パッケージのインストール
Node.js (推奨 v18+) がインストールされていることを確認してください。
```bash
npm install
```

#### 2.2 Gemini APIキーの設定
プロジェクトのルートディレクトリに `.env.local` ファイルを作成します：
```env
VITE_GEMINI_API_KEY=あなたのGoogle_Gemini_API_Key
```
*(APIキーは [Google AI Studio](https://aistudio.google.com/) で無料で取得できます)*

#### 2.3 開発サーバーの起動
```bash
npm run dev
# ブラウザで http://localhost:3000 を開く
```
起動後、画面上で **MANUAL（手動）**、**AI AUTO（自動）**、**EVOLUTION（進化）** モードを自由に切り替えられます。

---

## 📚 関連ドキュメント一覧

詳細については、`docs/` ディレクトリ内の以下のドキュメントをご参照ください：

1. **[ゲームメカニクスと戦術詳細 (docs/GAMEPLAY.ja.md)](docs/GAMEPLAY.ja.md)**: AP管理、ボスの4ターン行動サイクル、Arthurの「嘲諷（Taunt）」を用いた防御連携メカニクス。
2. **[強化学習の訓練と評価ガイド (docs/RL_TRAINING.ja.md)](docs/RL_TRAINING.ja.md)**: ハイパーパラメータ、カスタム評価指標、TensorBoardの各指標の解釈方法。
3. **[フロントエンドのデプロイガイド (docs/DEPLOYMENT_GUIDE.ja.md)](docs/DEPLOYMENT_GUIDE.ja.md)**: Vite環境設定、Gemini API統合、およびGitHub Pagesへのデプロイ手順。
4. **[卒業論文向け科学的実験ガイド (docs/RESEARCH_GUIDE.ja.md)](docs/RESEARCH_GUIDE.ja.md)**: 論文執筆のための定量指標（DPE, ST, DPT, HSR, DES）の集計とグラフプロットガイド。
5. **[最大ダメージ理論限界解析 (docs/MAX_DAMAGE_ANALYSIS.ja.md)](docs/MAX_DAMAGE_ANALYSIS.ja.md)**: 動的計画法（DP）による証明、状態空間の制限、および理論上の最適戦術スペクトル。

---

## 🤝 共同研究・論文での引用について

### ライセンス
本プロジェクトは [MIT License](LICENSE) の下でオープンソースとして公開されています。

### 貢献ガイドライン (Contributing)
新しいエージェントの追加、報酬設計の提案、人間による戦闘ログの共有などをご検討の際は、[貢献ガイドライン (CONTRIBUTING.ja.md)](CONTRIBUTING.ja.md) をご確認ください。

### 論文引用 (Citation)
本プロジェクトのコード、データ、または手法を学術論文や研究レポートで引用される場合は、以下の BibTeX フォーマットをご使用ください：

```bibtex
@misc{rerpg2026,
  author       = {kashin},
  title        = {rerpg: An Experimental Platform for Decision-Making Comparison under Extreme JRPG Resource Constraints},
  year         = {2026},
  publisher    = {GitHub},
  journal      = {GitHub Repository},
  howpublished = {\url{https://github.com/your-username/rerpg}}
}
```

---

*2026年度 卒業研究プロジェクト / 指導教員：[指導教員名] / 研究生：[氏名]*
