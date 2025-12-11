<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
    <%@ page import="java.util.List, java.util.Map" %>
        <%@ page import="jv16_Kadai03_B19.model.*" %>
            <!DOCTYPE html>
            <html lang="ja">

            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SmartShip - 賢い配送方法チェッカー</title>
                <link rel="stylesheet" type="text/css" href="css/style.css">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet">
            </head>

            <body>
                <div class="app-container">
                    <header class="app-header">
                        <h1>🚀 SmartShip</h1>
                        <p class="subtitle">賢い配送方法チェッカー</p>
                    </header>

                    <main class="main-content">
                        <!-- Quick Add Section -->
                        <section class="section quick-add-section">
                            <h2 class="section-title">
                                <span class="icon">📦</span>
                                商品を選択
                            </h2>
                            <p class="section-desc">よく使う商品を選んで、測定不要で配送料をチェック！</p>

                            <div class="category-tabs">
                                <button type="button" class="category-tab active" data-category="all">
                                    🏠 すべて
                                </button>
                                <% @SuppressWarnings("unchecked") List<String> categories = (List<String>)
                                        request.getAttribute("categories");
                                        @SuppressWarnings("unchecked")
                                        Map<String, List<ProductReference>> productsByCategory =
                                            (Map<String, List<ProductReference>>)
                                                request.getAttribute("productsByCategory");

                                                if (categories != null) {
                                                for (String category : categories) {
                                                String icon = "";
                                                String categoryJp = category;
                                                if ("Books".equals(category)) { icon = "📚"; categoryJp = "本・雑誌"; }
                                                else if ("Fashion".equals(category)) { icon = "👕"; categoryJp =
                                                "ファッション"; }
                                                else if ("Games".equals(category)) { icon = "🎮"; categoryJp = "ゲーム"; }
                                                else if ("Electronics".equals(category)) { icon = "📱"; categoryJp =
                                                "電子機器"; }
                                                else if ("Other".equals(category)) { icon = "📦"; categoryJp = "その他"; }
                                                else icon = "📦";
                                                %>
                                                <button type="button" class="category-tab"
                                                    data-category="<%= category %>">
                                                    <%= icon %>
                                                        <%= categoryJp %>
                                                </button>
                                                <% }} %>
                            </div>

                            <div class="product-grid">
                                <% if (productsByCategory !=null) { for (Map.Entry<String, List<ProductReference>> entry
                                    : productsByCategory.entrySet()) {
                                    String category = entry.getKey();
                                    for (ProductReference product : entry.getValue()) {
                                    %>
                                    <div class="product-card" data-category="<%= category %>">
                                        <form method="post" action="YuusouCheck">
                                            <input type="hidden" name="action" value="addToCart">
                                            <input type="hidden" name="productId" value="<%= product.getId() %>">
                                            <button type="submit" class="product-btn">
                                                <div class="product-icon">
                                                    <% if ("book".equals(product.getImageIcon())) { %>📖
                                                        <% } else if ("newspaper".equals(product.getImageIcon())) { %>📰
                                                            <% } else if ("shirt".equals(product.getImageIcon())) { %>👕
                                                                <% } else if ("gamepad".equals(product.getImageIcon()))
                                                                    { %>🎮
                                                                    <% } else if
                                                                        ("cards".equals(product.getImageIcon())) { %>🃏
                                                                        <% } else if
                                                                            ("phone".equals(product.getImageIcon())) {
                                                                            %>📱
                                                                            <% } else if
                                                                                ("tablet".equals(product.getImageIcon()))
                                                                                { %>📲
                                                                                <% } else if
                                                                                    ("gift".equals(product.getImageIcon()))
                                                                                    { %>🎁
                                                                                    <% } else { %>📦<% } %>
                                                </div>
                                                <div class="product-name">
                                                    <%= product.getNameJp() %>
                                                </div>
                                                <div class="product-size">
                                                    <%= String.format("%.0f×%.0f×%.0fcm", product.getLengthCm(),
                                                        product.getWidthCm(), product.getHeightCm()) %>
                                                </div>
                                                <div class="product-weight">
                                                    <%= product.getWeightG() %>g
                                                </div>
                                            </button>
                                        </form>
                                    </div>
                                    <% }}} %>
                            </div>
                        </section>

                        <!-- Manual Input Section -->
                        <section class="section manual-section">
                            <details class="collapsible">
                                <summary class="section-title clickable">
                                    <span class="icon">✏️</span>
                                    サイズを手動入力
                                    <span class="toggle-icon">▼</span>
                                </summary>

                                <form action="YuusouCheck" method="post" class="manual-form">
                                    <input type="hidden" name="inputMode" value="manual">
                                    <div class="input-row">
                                        <div class="input-group">
                                            <label>縦 (cm)</label>
                                            <input type="number" name="W" placeholder="例: 20" step="1" min="0">
                                        </div>
                                        <div class="input-group">
                                            <label>横 (cm)</label>
                                            <input type="number" name="D" placeholder="例: 15" step="1" min="0">
                                        </div>
                                        <div class="input-group">
                                            <label>厚さ (cm)</label>
                                            <input type="number" name="H" placeholder="例: 5" step="1" min="0">
                                        </div>
                                        <div class="input-group">
                                            <label>重さ (kg)</label>
                                            <input type="number" name="Weight" placeholder="例: 0.5" step="0.1" min="0">
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-primary">手動入力でチェック</button>
                                </form>
                            </details>
                        </section>

                        <!-- Cart Section -->
                        <section id="cart" class="section cart-section">
                            <h2 class="section-title">
                                <span class="icon">📦</span>
                                荷物の中身
                            </h2>

                            <% @SuppressWarnings("unchecked") List<CartItem> cart = (List<CartItem>)
                                    request.getAttribute("cart");
                                    Dimensions currentDims = (Dimensions) request.getAttribute("currentDimensions");

                                    if (cart != null && !cart.isEmpty()) {
                                    %>
                                    <div class="cart-items">
                                        <% for (CartItem item : cart) { %>
                                            <div class="cart-item">
                                                <span class="cart-item-name">
                                                    <%= item.getProduct().getNameJp() %>
                                                </span>
                                                <div class="cart-item-controls">
                                                    <form method="post" action="YuusouCheck" style="display:inline;">
                                                        <input type="hidden" name="action" value="removeFromCart">
                                                        <input type="hidden" name="productId"
                                                            value="<%= item.getProduct().getId() %>">
                                                        <button type="submit" class="qty-btn">−</button>
                                                    </form>
                                                    <span class="cart-item-qty">
                                                        <%= item.getQuantity() %>
                                                    </span>
                                                    <form method="post" action="YuusouCheck" style="display:inline;">
                                                        <input type="hidden" name="action" value="addToCart">
                                                        <input type="hidden" name="productId"
                                                            value="<%= item.getProduct().getId() %>">
                                                        <button type="submit" class="qty-btn">+</button>
                                                    </form>
                                                </div>
                                            </div>
                                            <% } %>
                                    </div>

                                    <% if (currentDims !=null) { %>
                                        <div class="cart-summary">
                                            <div class="summary-row">
                                                <span>📐 推定サイズ:</span>
                                                <span>
                                                    <%= currentDims.getSizeString() %>
                                                </span>
                                            </div>
                                            <div class="summary-row">
                                                <span>⚖️ 合計重量:</span>
                                                <span>
                                                    <%= currentDims.getWeightString() %>
                                                </span>
                                            </div>
                                            <div class="summary-row">
                                                <span>📊 3辺合計:</span>
                                                <span>
                                                    <%= String.format("%.0f", currentDims.getSizeSum()) %> cm
                                                </span>
                                            </div>
                                        </div>
                                        <% } %>

                                            <div class="cart-actions">
                                                <form method="post" action="YuusouCheck" style="display:inline;"
                                                    onsubmit="return confirm('本当にクリアしますか？');">
                                                    <input type="hidden" name="action" value="clearCart">
                                                    <button type="submit" class="btn btn-secondary">クリア</button>
                                                </form>
                                                <form method="post" action="YuusouCheck" style="display:inline;">
                                                    <input type="hidden" name="inputMode" value="cart">
                                                    <button type="submit" class="btn btn-primary">配送料をチェック 🔍</button>
                                                </form>
                                            </div>

                                            <div class="cart-empty">
                                                <p>箱は空です。上から商品を追加してください。</p>
                                            </div>
                </div>
                <% } %>
                    </section>
                    </main>

                    <footer class="app-footer">
                        <p>SmartShip © 2024 - メルカリ・ヤフオク出品者向け</p>
                    </footer>
                    </div>

                    <script>
                        // Restore scroll position on page load
                        window.addEventListener('load', function () {
                            const scrollPos = sessionStorage.getItem('scrollPos');
                            if (scrollPos) {
                                window.scrollTo(0, parseInt(scrollPos));
                                sessionStorage.removeItem('scrollPos');
                            }
                        });

                        // Save scroll position before form submit
                        document.querySelectorAll('form').forEach(form => {
                            form.addEventListener('submit', function () {
                                sessionStorage.setItem('scrollPos', window.scrollY);
                            });
                        });

                        // Category filter functionality
                        document.querySelectorAll('.category-tab').forEach(tab => {
                            tab.addEventListener('click', function () {
                                const category = this.dataset.category;

                                // Toggle active state
                                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                                this.classList.add('active');

                                // Filter products
                                document.querySelectorAll('.product-card').forEach(card => {
                                    if (category === 'all' || card.dataset.category === category) {
                                        card.style.display = 'block';
                                    } else {
                                        card.style.display = 'none';
                                    }
                                });
                            });
                        });

                        // Show all by default
                        document.querySelectorAll('.product-card').forEach(card => {
                            card.style.display = 'block';
                        });
                    </script>
            </body>

            </html>