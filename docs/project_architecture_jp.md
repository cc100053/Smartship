# SmartShip プロジェクト詳細解説

このアプリケーションは、**Spring Boot (Backend)** と **React (Frontend)** という現代的なウェブ開発の標準的な構成（分離型構成）で作られています。

## 1. 全体アーキテクチャ

*   **Backend (Java / Spring Boot 3)**:
    *   **役割**: 重い計算（3Dパッキングアルゴリズム）、データベース操作、配送ルールの判定。
    *   **理由**: 総当たり（Brute-Force）で最適な箱詰めを計算するには、JavaScriptよりもJavaのようなコンパイル言語の方が高速で型安全だからです。
*   **Frontend (React 19 / Vite)**:
    *   **役割**: 配列、3Dビジュアライゼーション、ユーザーインターフェース。
    *   **理由**: ユーザーが商品をカートに入れた瞬間に「どの箱になるか」を3Dで確認できる高いインタラクティブ性が必要なため、SPA（Single Page Application）として構築されています。

---

## 2. Backend (Java) の詳細解説

場所: `backend/src/main/java/com/smartship/`

### A. Controller (司令塔)
**ファイル**: `controller/ShippingController.java`
*   **仕事**: フロントエンドからのリクエスト（「この商品を計算して！」）を受け付けます。
*   **流れ**:
    1.  `calculateCart` メソッドが呼ばれる。
    2.  `PackingService` に「商品を3Dパッキングしてサイズを教えて」と依頼。
    3.  返ってきたサイズを元に、`ShippingMatcher` に「一番安い配送方法は？」と依頼。
    4.  結果をまとめてJSONでフロントエンドに返す。
*   **ポイント**: ロジックをここに書かず、Serviceに丸投げしているのが良い設計です（責任の分離）。

### B. Service (計算ロジック)
ここがこのアプリの**心臓部**です。

**ファイル**: `service/PackingService.java`
*   **仕事**: **「特定の箱」に商品が入るかどうか**の判定（`canFit`）や、詰め方のパズル計算（`calculatePackedResult`）を担当します。
*   **仕組み**: `3d-bin-container-packing` というライブラリを使い、総当たりで計算しています。
    *   **ポイント**:
        *   **Library First**: 基本的にはライブラリの強力なアルゴリズム（FastLargestAreaFitFirstなど）を使用し、「回転」や「配置順」を考慮した緻密な計算を行います。
        *   **Fallback Strategies**: 万が一計算が失敗した場合でも、単純な体積計算などで概算を出す機能を持っています。

**ファイル**: `service/ShippingMatcher.java`
*   **仕事**: **「安い箱から順に」**実際に商品が入るかを確認し、最適な配送業者を選定します。
    *   **ロジック**:
        1.  配送方法を料金が安い順（ネコポス → 宅急便コンパクト → …）に並び替える。
        2.  一つずつ `PackingService.canFit()` を呼び出し、入るかどうかを確かめる。
        3.  物理的に入るものの中で、追跡・補償などの条件を満たす最安のものを提案する。
    *   **工夫点**: 単に「使えません」と返すだけでなく、「なぜ安い方の便が使えないのか（例：厚さが1cmオーバーしたから）」という理由を生成し、UIに表示します。

### C. Data Access (データの保存・取得)
**ファイル**: `repository/ProductRepository.java`, `ShippingCarrierRepository.java`
*   **仕事**: データベース（Supabase PostgreSQL）から商品マスタや配送業者マスタを取得します。
*   **技術**: JPA (Hibernate) を使っており、SQLを書かずにJavaのメソッドだけでデータベース操作ができるようになっています。

---

## 3. Frontend (React) の詳細解説

場所: `frontend/src/`

### A. Entry Point
**ファイル**: `App.jsx`
*   **仕事**: 全体のレイアウト。背景のアニメーション（`animate-blob`）や、スクロール管理を行っています。

### B. 3D Visualization (3D表示)
**ファイル**: `components/ParcelVisualizer3D.jsx`
*   **仕事**: 計算結果をブラウザ上で3D表示します。
*   **技術**: `@react-three/fiber` (Three.jsのReactラッパー) を使用。
*   **座標変換**: Javaのライブラリ（Y軸が奥行き）と、Three.js（Z軸が奥行き）で座標系が違うため、`PlacedBox` コンポーネント内で座標の入れ替え（Translation）を行っています。
*   **工夫点**:
    *   **Reference Object**: タバコ箱やスマホなどの「比較対象」を隣に置くことで、サイズ感を直感的に分かるようにしています。
    *   **OrbitControls**: ユーザーがマウスでぐるぐる回せる機能を提供しています。

### C. State Management
**ファイル**: `hooks/useCart.js`, `hooks/useShippingCalculator.js`
*   **仕事**: ユーザーの入力状態（カートの中身）を管理します。
*   **工夫点**: 画面をリロードしてもカートの中身が消えないように、`localStorage` に保存する仕組みが入っています。

---

## 4. "Why coding like this?" (なぜこの設計なのか)

### Q1. なぜ API を分けているのか？
将来的に「スマホアプリ版」や「外部企業向けAPI」を作る際、Backendの計算ロジック（Java部分）をそのまま再利用できるようにするためです。Frontend（見た目）とBackend（頭脳）を完全に切り離しています。

### Q2. なぜ 3D計算を Backend でやるのか？
3Dパッキングは計算量が膨大（商品の組み合わせの階乗）になりがちです。ブラウザ（JavaScript）でやるとスマホが熱くなったりフリーズしたりする可能性があります。サーバー（Java）で一瞬で計算して、結果だけを返す方がユーザー体験が良いからです。

### Q3. Legacy Code (`jv16_Kadai03_B19`) との違いは？
古いフォルダにあるコードは「Servlet」という古い技術で、HTML生成とロジックが混ざっていました。新しい設計（Spring Boot + React）では、データのやり取り（API）だけに特化することで、コードの見通しが良く、バグ修正や機能追加が圧倒的にしやすくなっています。
