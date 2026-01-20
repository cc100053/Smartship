# Q&A

## 1. Why using these tech-stack to build this project?
（なぜこの技術スタックを選定したのですか？）

このプロジェクト（SmartShip）では、日本の物流システム特有の複雑さと、高度な3Dパッキング計算を両立させるために、以下の技術スタックを選定しました。

### Backend: Spring Boot 3 (Java 21)
**選定理由: 「計算力」と「堅牢性」**

このシステムの核心は、商品の回転（`.withRotate3D()`）や配置順序の組み合わせを総当たりで検証する「Brute Force 3D Packing」アルゴリズムです。
*   **計算能力:** 多数のアイテムを扱う際の指数関数的な計算負荷に耐え、ミリ秒単位で結果を返すために、コンパイル言語でありパフォーマンスに優れたJavaを採用しました。
*   **信頼性:** 20種類以上の配送キャリア（ネコポス、ゆうパック等）の複雑なサイズ・重量制限ルールを型安全に管理するため、Spring Bootの強力なDI（依存性注入）とアーキテクチャを活用しています。

### Frontend: React 19 + Vite + Tailwind CSS
**選定理由: 「軽量な3D可視化」と「開発速度」**

ユーザーに「なぜこの箱なのか」を直感的に伝えるための3Dビジュアライザーが必要でした。
*   **軽量3D:** 重いWebGLライブラリを使わず、標準的なCSS Transformだけで動作するカスタム3Dレンダラーを実装するため、コンポーネント指向でDOM操作に優れたReact 19最適でした。これにより、ブラウザへの負荷を最小限に抑えています。
*   **デザイン:** 複雑な料金比較表やフォームを、美しくレスポンシブに構築するためにTailwind CSSを採用しました。

### Database: Supabase (PostgreSQL)
**選定理由: 「データ整合性」と「立ち上げの速さ」**

*   配送サービスの料金体系や寸法制限は頻繁に変更される可能性があります。これらをリレーショナルデータとして厳格に管理しつつ、開発初期のスピードを最大化するために、PostgreSQLベースのBaaSであるSupabaseを採用しました。

## 2. Spring Bootの強力なDIとは？
**依存性注入（Dependency Injection）による、「疎結合」で「テスト容易」な設計のことです。**

通常のJava開発では `new PackingService()` のように自分でインスタンスを生成しますが、Spring Bootでは `@Service` や `@Component` をつけたクラスを自動的に管理（DIコンテナ）し、必要な場所（`ShippingController`）に自動で渡してくれます。

### 1. なぜこれが強力なのか？
このプロジェクト（SmartShip）では、配送計算ロジック（Service）と、それを使うWeb API（Controller）を明確に分離できています。
*   **柔軟な交換:** 例えば、将来的に「AIを使った新しい梱包アルゴリズム」を作った場合、Controllerのコードを一切変更することなく、DIの設定を変えるだけでアルゴリズムを差し替えることができます。
*   **テストの容易さ:** テスト時には本物の「Supabaseデータベース」や「3D計算処理」を使う代わりに、「モック（偽物）」を注入することができます。これにより、データベース接続なしでWeb APIの動作チェックが可能になります。

### 2. SmartShipでの具体例
`ShippingController.java` のコンストラクタを見てください。
```java
// ShippingController.java
public ShippingController(
        ProductRepository productRepository,    // データベース操作
        ShippingMatcher shippingMatcher,        // 料金比較ロジック
        PackingService packingService           // 3Dパッキング計算
    ) {
    this.productRepository = productRepository;
    this.shippingMatcher = shippingMatcher;
    this.packingService = packingService;
}
```
ここでは `new` キーワードを一度も使っていません。
Spring Bootが起動時に勝手に最適なインスタンス（`PackingService` など）を生成し、このコンストラクタに**注入（Inject）**してくれます。これにより、開発者は「オブジェクトの管理」から解放され、「ロジックの実装」に集中できます。
