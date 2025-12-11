<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
    <%@ page import="java.util.List" %>
        <%@ page import="jv16_Kadai03_B19.model.*" %>
            <%@ page import="jv16_Kadai03_B19.Yuusou" %>
                <!DOCTYPE html>
                <html lang="ja">

                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>SmartShip - 配送結果</title>
                    <link rel="stylesheet" type="text/css" href="css/style.css">
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link
                        href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap"
                        rel="stylesheet">
                </head>

                <body>
                    <div class="app-container">
                        <header class="app-header result-header">
                            <h1>🚀 SmartShip</h1>
                            <p class="subtitle">配送結果</p>
                        </header>

                        <main class="main-content">
                            <% Dimensions dims=(Dimensions) request.getAttribute("dimensions");
                                @SuppressWarnings("unchecked") List<ShippingResult> results = (List<ShippingResult>)
                                    request.getAttribute("shippingResults");
                                    @SuppressWarnings("unchecked")
                                    List<CartItem> cart = (List<CartItem>) request.getAttribute("cart");
                                            Boolean hasResults = (Boolean) request.getAttribute("hasResults");
                                            %>

                                            <!-- Package Summary -->
                                            <section class="section summary-section">
                                                <div class="package-summary">
                                                    <div class="summary-header">
                                                        <span class="summary-icon">📦</span>
                                                        <h2>荷物の概要</h2>
                                                    </div>
                                                    <div class="summary-details">
                                                        <% if (cart !=null && !cart.isEmpty()) { %>
                                                            <div class="detail-row">
                                                                <span class="label">商品数:</span>
                                                                <span class="value">
                                                                    <%= dims.getItemCount() %>点
                                                                </span>
                                                            </div>
                                                            <% } %>
                                                                <div class="detail-row">
                                                                    <span class="label">推定サイズ:</span>
                                                                    <span class="value">
                                                                        <%= dims.getSizeString() %>
                                                                    </span>
                                                                </div>
                                                                <div class="detail-row">
                                                                    <span class="label">3辺合計:</span>
                                                                    <span class="value">
                                                                        <%= String.format("%.0f", dims.getSizeSum()) %>
                                                                            cm
                                                                    </span>
                                                                </div>
                                                                <div class="detail-row">
                                                                    <span class="label">合計重量:</span>
                                                                    <span class="value">
                                                                        <%= dims.getWeightString() %>
                                                                    </span>
                                                                </div>
                                                    </div>

                                                    <% if (cart !=null && !cart.isEmpty()) { %>
                                                        <div class="item-list">
                                                            <h3>内容物:</h3>
                                                            <ul>
                                                                <% for (CartItem item : cart) { %>
                                                                    <li>
                                                                        <%= item.getProduct().getNameJp() %> × <%=
                                                                                item.getQuantity() %>
                                                                    </li>
                                                                    <% } %>
                                                            </ul>
                                                        </div>
                                                        <% } %>
                                                </div>
                                            </section>

                                            <% if (hasResults !=null && hasResults) { %>
                                                <!-- Recommended Option -->
                                                <section class="section recommendation-section">
                                                    <% ShippingResult recommended=results.get(0); ShippingCarrier
                                                        carrier=recommended.getCarrier(); %>
                                                        <div class="recommendation-card">
                                                            <div class="recommendation-badge">🏆 おすすめ</div>
                                                            <div class="carrier-info">
                                                                <div class="carrier-name">
                                                                    <%= carrier.getFullName() %>
                                                                </div>
                                                                <div class="carrier-price">¥<%= carrier.getPriceYen() %>
                                                                </div>
                                                            </div>
                                                            <!-- Tracking Badge -->
                                                            <div style="margin: 8px 0;">
                                                                <% if (carrier.isHasTracking()) { %>
                                                                    <span
                                                                        style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">📦
                                                                        追跡あり</span>
                                                                    <% } else { %>
                                                                        <span
                                                                            style="background: #FF9800; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">⚠️
                                                                            追跡なし</span>
                                                                        <% } %>
                                                            </div>
                                                            <div class="recommendation-reason">
                                                                <span class="reason-icon">💡</span>
                                                                <span class="reason-text">
                                                                    <%= recommended.getReason() %>
                                                                </span>
                                                            </div>
                                                            <% if (carrier.getNotes() !=null &&
                                                                !carrier.getNotes().isEmpty()) { %>
                                                                <div class="carrier-notes">
                                                                    <span class="notes-icon">📝</span>
                                                                    <%= carrier.getNotes() %>
                                                                </div>
                                                                <% } %>
                                                                    <% if (carrier.getSendLocation() !=null &&
                                                                        !carrier.getSendLocation().isEmpty()) { %>
                                                                        <div class="carrier-notes"
                                                                            style="color: #666; font-size: 0.9em; margin-top: 5px;">
                                                                            <span class="notes-icon">🏪</span>
                                                                            発送場所: <%= carrier.getSendLocation() %>
                                                                        </div>
                                                                        <% } %>
                                                        </div>
                                                </section>

                                                <!-- Other Options -->
                                                <% if (results.size()> 1) { %>
                                                    <section class="section other-options-section">
                                                        <h2 class="section-title">
                                                            <span class="icon">📋</span>
                                                            他の配送オプション
                                                        </h2>
                                                        <div class="options-list">
                                                            <% for (int i=1; i < results.size(); i++) { ShippingResult
                                                                result=results.get(i); ShippingCarrier
                                                                optCarrier=result.getCarrier(); %>
                                                                <div class="option-card">
                                                                    <div class="option-name">
                                                                        <%= optCarrier.getFullName() %>
                                                                    </div>
                                                                    <% if (optCarrier.getSendLocation() !=null &&
                                                                        !optCarrier.getSendLocation().isEmpty()) { %>
                                                                        <div
                                                                            style="font-size: 0.8em; color: #888; width: 100%; margin-top: 4px;">
                                                                            🏪 <%= optCarrier.getSendLocation() %>
                                                                        </div>
                                                                        <% } %>
                                                                            <div class="option-price">¥<%=
                                                                                    optCarrier.getPriceYen() %>
                                                                            </div>
                                                                            <!-- Tracking Badge for Other Options -->
                                                                            <% if (optCarrier.isHasTracking()) { %>
                                                                                <span
                                                                                    style="background: #4CAF50; color: white; padding: 1px 6px; border-radius: 8px; font-size: 0.7em; margin-left: 5px;">追跡○</span>
                                                                                <% } else { %>
                                                                                    <span
                                                                                        style="background: #FF9800; color: white; padding: 1px 6px; border-radius: 8px; font-size: 0.7em; margin-left: 5px;">追跡×</span>
                                                                                    <% } %>
                                                                                        <% if (optCarrier.getNotes()
                                                                                            !=null &&
                                                                                            !optCarrier.getNotes().isEmpty())
                                                                                            { %>
                                                                                            <div class="option-notes">
                                                                                                <%= optCarrier.getNotes()
                                                                                                    %>
                                                                                            </div>
                                                                                            <% } %>
                                                                </div>
                                                                <% } %>
                                                        </div>
                                                    </section>
                                                    <% } %>

                                                        <% } else { %>
                                                            <!-- Size Over Message -->
                                                            <section class="section error-section">
                                                                <div class="error-card">
                                                                    <div class="error-icon">😱</div>
                                                                    <h2>サイズオーバー</h2>
                                                                    <p>対応可能な配送方法が見つかりませんでした。</p>
                                                                    <p class="error-hint">引っ越し会社や大型配送サービスをご検討ください。</p>
                                                                </div>
                                                            </section>
                                                            <% } %>

                                                                <!-- Reference Link -->
                                                                <section class="section"
                                                                    style="margin-top: 20px; text-align: center;">
                                                                    <a href="https://pj.mercari.com/mercari-spot/mercari_school_list.pdf"
                                                                        target="_blank"
                                                                        style="color: #888; font-size: 0.85em; text-decoration: underline;">
                                                                        📄 配送方法の詳細はこちら（メルカリ公式PDF）
                                                                    </a>
                                                                </section>

                                                                <!-- Actions -->
                                                                <section class="section actions-section">
                                                                    <a href="YuusouCheck" class="btn btn-primary">←
                                                                        戻って再計算</a>
                                                                </section>
                        </main>

                        <footer class="app-footer">
                            <p>SmartShip © 2024 - メルカリ・ヤフオク出品者向け</p>
                        </footer>
                    </div>
                </body>

                </html>