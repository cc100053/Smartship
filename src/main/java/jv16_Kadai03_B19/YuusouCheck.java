package jv16_Kadai03_B19;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import jv16_Kadai03_B19.dao.ProductDAO;
import jv16_Kadai03_B19.model.CartItem;
import jv16_Kadai03_B19.model.Dimensions;
import jv16_Kadai03_B19.model.ProductReference;
import jv16_Kadai03_B19.model.ShippingResult;
import jv16_Kadai03_B19.service.DimensionCalculator;
import jv16_Kadai03_B19.service.ShippingMatcher;

@WebServlet("/YuusouCheck")
public class YuusouCheck extends HttpServlet {
	private static final long serialVersionUID = 1L;
	
	private ProductDAO productDAO;
	private DimensionCalculator dimensionCalculator;
	private ShippingMatcher shippingMatcher;
	
	@Override
	public void init() throws ServletException {
		super.init();
		productDAO = new ProductDAO();
		dimensionCalculator = new DimensionCalculator();
		shippingMatcher = new ShippingMatcher();
	}

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		// Load products grouped by category for Quick Add UI
		List<ProductReference> allProducts = productDAO.getAllProducts();
		List<String> categories = productDAO.getAllCategories();
		
		// Group products by category
		Map<String, List<ProductReference>> productsByCategory = new HashMap<>();
		for (ProductReference product : allProducts) {
			productsByCategory
				.computeIfAbsent(product.getCategory(), k -> new ArrayList<>())
				.add(product);
		}
		
		request.setAttribute("products", allProducts);
		request.setAttribute("categories", categories);
		request.setAttribute("productsByCategory", productsByCategory);
		
		// Get cart from session (or create empty)
		HttpSession session = request.getSession();
		@SuppressWarnings("unchecked")
		List<CartItem> cart = (List<CartItem>) session.getAttribute("cart");
		if (cart == null) {
			cart = new ArrayList<>();
			session.setAttribute("cart", cart);
		}
		request.setAttribute("cart", cart);
		
		// Calculate current dimensions if cart has items
		if (!cart.isEmpty()) {
			Dimensions currentDims = dimensionCalculator.calculateFromCart(cart);
			request.setAttribute("currentDimensions", currentDims);
		}
		
		RequestDispatcher dispatcher = request.getRequestDispatcher("WEB-INF/YuusouCheck.jsp");
		dispatcher.forward(request, response);
	}

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		request.setCharacterEncoding("UTF-8");
		
		String action = request.getParameter("action");
		HttpSession session = request.getSession();
		
		// Handle cart actions
		if ("addToCart".equals(action)) {
			handleAddToCart(request, session);
			response.sendRedirect("YuusouCheck#cart");
			return;
		} else if ("removeFromCart".equals(action)) {
			handleRemoveFromCart(request, session);
			response.sendRedirect("YuusouCheck#cart");
			return;
		} else if ("clearCart".equals(action)) {
			session.setAttribute("cart", new ArrayList<CartItem>());
			response.sendRedirect("YuusouCheck#cart");
			return;
		}
		
		// Handle shipping calculation
		Dimensions dims;
		String inputMode = request.getParameter("inputMode");
		
		if ("cart".equals(inputMode)) {
			// Calculate from cart
			@SuppressWarnings("unchecked")
			List<CartItem> cart = (List<CartItem>) session.getAttribute("cart");
			if (cart == null || cart.isEmpty()) {
				response.sendRedirect("YuusouCheck");
				return;
			}
			dims = dimensionCalculator.calculateFromCart(cart);
		} else {
			// Manual input mode (fallback)
			String W = request.getParameter("W");
			String D = request.getParameter("D");
			String H = request.getParameter("H");
			String Weight = request.getParameter("Weight");
			
			int w = Integer.parseInt(W);
			int d = Integer.parseInt(D);
			int h = Integer.parseInt(H);
			double weight = Double.parseDouble(Weight);
			
			dims = dimensionCalculator.calculateFromManualInput(w, d, h, weight);
		}
		
		// Find shipping options
		List<ShippingResult> results = shippingMatcher.findBestOptions(dims);
		
		// Get cart for display
		@SuppressWarnings("unchecked")
		List<CartItem> cart = (List<CartItem>) session.getAttribute("cart");
		
		// Set attributes for result page
		request.setAttribute("dimensions", dims);
		request.setAttribute("shippingResults", results);
		request.setAttribute("cart", cart);
		request.setAttribute("hasResults", !results.isEmpty());
		
		// For backward compatibility, also set the old yuusou object
		Yuusou yuusou = new Yuusou();
		yuusou.setW((int) dims.getLengthCm());
		yuusou.setD((int) dims.getWidthCm());
		yuusou.setH((int) dims.getHeightCm());
		yuusou.setWeight(dims.getWeightKg());
		
		if (results.isEmpty()) {
			yuusou.setJudge("サイズオーバー、引っ越し会社に頼んで");
		} else {
			ShippingResult recommended = results.get(0);
			yuusou.setJudge(recommended.getCarrier().getFullName() + " ¥" + recommended.getCarrier().getPriceYen());
		}
		request.setAttribute("yuusou", yuusou);
		
		RequestDispatcher dispatcher = request.getRequestDispatcher("WEB-INF/YuusouCheckResult.jsp");
		dispatcher.forward(request, response);
	}
	
	/**
	 * Add product to cart
	 */
	private void handleAddToCart(HttpServletRequest request, HttpSession session) {
		String productIdStr = request.getParameter("productId");
		if (productIdStr == null) return;
		
		int productId = Integer.parseInt(productIdStr);
		ProductReference product = productDAO.getProductById(productId);
		if (product == null) return;
		
		@SuppressWarnings("unchecked")
		List<CartItem> cart = (List<CartItem>) session.getAttribute("cart");
		if (cart == null) {
			cart = new ArrayList<>();
		}
		
		// Check if product already in cart
		boolean found = false;
		for (CartItem item : cart) {
			if (item.getProduct().getId() == productId) {
				item.increment();
				found = true;
				break;
			}
		}
		
		// Add new item if not found
		if (!found) {
			cart.add(new CartItem(product));
		}
		
		session.setAttribute("cart", cart);
	}
	
	/**
	 * Remove or decrement product from cart
	 */
	private void handleRemoveFromCart(HttpServletRequest request, HttpSession session) {
		String productIdStr = request.getParameter("productId");
		if (productIdStr == null) return;
		
		int productId = Integer.parseInt(productIdStr);
		
		@SuppressWarnings("unchecked")
		List<CartItem> cart = (List<CartItem>) session.getAttribute("cart");
		if (cart == null) return;
		
		cart.removeIf(item -> {
			if (item.getProduct().getId() == productId) {
				item.decrement();
				return item.getQuantity() <= 0;
			}
			return false;
		});
		
		session.setAttribute("cart", cart);
	}
}
