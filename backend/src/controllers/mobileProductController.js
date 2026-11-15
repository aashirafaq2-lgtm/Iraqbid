import pool from "../config/db.js";
import { fixImageUrlsInResponse, fixImageUrlInItem } from "../utils/imageUrlFixer.js";
import { notifyAdmins } from "../utils/notificationUtils.js";

export const MobileProductController = {
  // POST /api/products/create
  async createProduct(req, res) {
    try {
      const { title, description, images, image_url, startingPrice, duration, category_id, real_price } = req.body;
      const sellerId = req.user.id;

      console.log('🔍 [CreateProduct] Request received:', {
        userId: sellerId,
        userRole: req.user.role,
        title: title,
        hasImages: !!images,
        hasImageUrl: !!image_url,
        category_id: category_id
      });

      // Validation: Required fields
      if (!title || !startingPrice) {
        return res.status(400).json({
          success: false,
          message: "Title and starting price are required"
        });
      }

      // Validate category_id is required
      if (!category_id) {
        return res.status(400).json({
          success: false,
          message: "Category is required"
        });
      }

      // Validate seller role - accept both 'seller_products' and 'seller'
      const userRole = (req.user.role || '').toLowerCase().trim();
      const sellerRoles = ['seller_products', 'seller', 'user'];
      if (!sellerRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Only sellers can create products. Your current role: ${req.user.role || 'unknown'}`
        });
      }

      // Validate category_id exists and is active
      const categoryCheck = await pool.query(
        "SELECT id, active FROM categories WHERE id = $1",
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Category not found"
        });
      }

      if (!categoryCheck.rows[0].active) {
        return res.status(400).json({
          success: false,
          message: "Category is not active"
        });
      }

      // Handle images: Support both new 'images' array and legacy 'image_url'
      let imagesArray = [];
      if (images && Array.isArray(images) && images.length > 0) {
        imagesArray = images.filter(url => url && url.trim() !== '');
      } else if (image_url) {
        // Legacy support: convert single image_url to array
        if (Array.isArray(image_url)) {
          imagesArray = image_url.filter(url => url && url.trim() !== '');
        } else if (typeof image_url === 'string' && image_url.trim() !== '') {
          imagesArray = [image_url];
        }
      }

      // Validate: At least 1 image required
      if (imagesArray.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one image is required"
        });
      }

      // Validate: Maximum 6 images
      if (imagesArray.length > 6) {
        return res.status(400).json({
          success: false,
          message: "Maximum 6 images allowed"
        });
      }

      // Validate duration: must be 1, 2, or 3 days only
      const days = duration || 1;
      if (![1, 2, 3].includes(days)) {
        return res.status(400).json({
          success: false,
          message: "Duration must be 1, 2, or 3 days only"
        });
      }

      // Mark product source based on user role
      // Admin/Employee roles -> company, Others -> seller
      const productSource = (userRole === 'admin' || userRole === 'superadmin' || userRole === 'moderator' || userRole === 'employee' || userRole === 'company_products') ? 'company' : 'seller';

      // Products require admin approval before going live
      // They will appear in the "Pending Approvals" section of admin panel
      const status = 'pending';
      const result = await pool.query(
        `INSERT INTO products 
         (seller_id, title, description, images, image_url, starting_price, starting_bid, 
          current_price, current_bid, status, auction_end_time, duration, category_id, product_source, real_price, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $6, $6, $6, $7, CURRENT_TIMESTAMP + ($8 * INTERVAL '1 day'), $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
         RETURNING *`,
        [
          sellerId,
          title,
          description || null,
          JSON.stringify(imagesArray), // images as JSONB
          imagesArray[0] || null, // image_url for backward compatibility
          startingPrice,
          status,
          days, // duration: 1, 2, or 3
          category_id, // Required - already validated above
          productSource,
          req.body.real_price || 0
        ]
      );

      console.log('✅ [CreateProduct] Product created successfully:', {
        productId: result.rows[0].id,
        imagesCount: imagesArray.length,
        real_price: result.rows[0].real_price
      });

      // Create notification for admin about new product pending approval
      await notifyAdmins(
        'New Product Pending Approval',
        `New product "${title}" is waiting for approval (Market Value: ${req.body.real_price || 0})`,
        'product',
        result.rows[0].id
      );

      res.status(201).json({
        success: true,
        message: "Product submitted successfully. It will be live once approved by an administrator.",
        data: result.rows[0]
      });
    } catch (error) {
      console.error("❌ [CreateProduct] Error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error"
      });
    }
  },

  // GET /api/products/mine
  // GET /api/products/mine
  async getMyProducts(req, res) {
    try {
      console.log('📦 GET /api/products/mine - Request received');
      const userId = req.user.id;
      const { status, page = 1, limit = 20 } = req.query;

      // Build query
      let query = `
        SELECT 
          p.id, p.seller_id, p.title, p.description, p.image_url, p.images, p.status,
          p.created_at, p.category_id, p.highest_bidder_id, p.auction_end_time,
          COALESCE(p.starting_price, 0) as starting_price,
          COALESCE(p.starting_bid, 0) as starting_bid,
          COALESCE(p.current_price, 0) as current_price,
          COALESCE(p.current_bid, 0) as current_bid,
          COALESCE(p.total_bids, 0) as total_bids,
          COALESCE(c.name, 'Uncategorized') as category_name,
          COALESCE(u.name, 'Me') as seller_name,
          COALESCE(p.real_price, 0) as real_price
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.seller_id = u.id
        WHERE p.seller_id = $1
      `;
      const params = [userId];
      let paramCount = 2;

      if (status) {
        query += ` AND p.status = $${paramCount++} `;
        params.push(status);
      }

      // 🔍 Count query
      let countQuery = `SELECT COUNT(*) as count FROM products p WHERE p.seller_id = $1`;
      const countParams = [userId];
      if (status) {
        countQuery += ` AND p.status = $2`;
        countParams.push(status);
      }
      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      query += ` ORDER BY p.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount} `;
      params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

      const result = await pool.query(query, params);
      const fixedData = fixImageUrlsInResponse(result.rows);

      const products = fixedData.map(p => ({
        ...p,
        id: parseInt(p.id),
        current_bid: Number(p.current_bid || 0),
        current_price: Number(p.current_price || 0),
        starting_price: Number(p.starting_price || 0),
        starting_bid: Number(p.starting_bid || 0),
        total_bids: parseInt(p.total_bids || 0),
        real_price: Number(p.real_price || 0),
        images: Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? JSON.parse(p.images || '[]') : []),

        // CamelCase aliases
        imageUrl: p.image_url,
        createdAt: p.created_at,
        categoryName: p.category_name,
        sellerName: p.seller_name,
        categoryId: p.category_id ? parseInt(p.category_id) : null,
        sellerId: p.seller_id ? parseInt(p.seller_id) : null,

        // Nested objects
        category: p.category_id ? { id: parseInt(p.category_id), name: p.category_name } : null,
        seller: p.seller_id ? { id: parseInt(p.seller_id), name: p.seller_name } : null
      }));

      res.json({
        success: true,
        data: products,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: totalCount > 0 ? Math.ceil(totalCount / limit) : 0
        }
      });
    } catch (error) {
      console.error("❌ Error fetching my products:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: [],
        pagination: { total: 0, page: 1, limit: 20, pages: 0 }
      });
    }
  },

  // Alias for getMyProducts (for API consistency)
  async getSellerProducts(req, res) {
    return this.getMyProducts(req, res);
  },

  // GET /api/company/products (Company Store - Company/Admin products ONLY)
  async getCompanyProducts(req, res) {
    console.log('🔹 getCompanyProducts wrapper called');
    const mockReq = {
      query: { ...req.query, source: 'company' },
      user: req.user,
      method: req.method,
      url: req.url,
      headers: req.headers
    };
    console.log('   Passing query to getAllProducts:', mockReq.query);
    return MobileProductController.getAllProducts(mockReq, res);
  },

  // GET /api/seller/products (Marketplace - Seller products ONLY)
  async getMarketplaceProducts(req, res) {
    console.log('🔹 getMarketplaceProducts wrapper called');
    const mockReq = {
      query: { ...req.query, source: 'seller' },
      user: req.user,
      method: req.method,
      url: req.url,
      headers: req.headers
    };
    console.log('   Passing query to getAllProducts:', mockReq.query);
    return MobileProductController.getAllProducts(mockReq, res);
  },

  // GET /api/products (public - ALL approved/live products: company + seller)
  // GET /api/products (public - ALL approved/live products: company + seller)
  async getAllProducts(req, res) {
    try {
      // 🔍 CACHE FIX: Set headers immediately at the start to prevent old data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log('🚀🚀🚀 [MOBILE_API] FETCHING ALL PRODUCTS 🚀🚀🚀');
      const { category, search, source, page = 1, limit = 20 } = req.query || {};
      let normalizedSource = (source || '').toLowerCase().trim();

      // Robust alias handling
      if (normalizedSource === 'saller' || normalizedSource === 'saler') {
        normalizedSource = 'seller';
      }

      console.log(`🚀[getAllProducts] Request: src = "${normalizedSource}", cat = "${category}", search = "${search}"`);
      let query = `
        SELECT 
          p.id, p.seller_id, p.title, p.description, p.image_url, p.images, p.status,
          p.created_at, p.category_id, p.highest_bidder_id, p.auction_end_time,
          p.starting_price, p.starting_bid,
          COALESCE(NULLIF(p.current_bid, 0), NULLIF(p.current_price, 0), p.starting_bid, p.starting_price, 0) as current_bid,
          COALESCE(NULLIF(p.current_price, 0), NULLIF(p.current_bid, 0), p.starting_price, p.starting_bid, 0) as current_price,
          COALESCE(p.total_bids, (SELECT COUNT(*) FROM bids WHERE product_id = p.id), 0) as total_bids,
          COALESCE(u.name, 'BidMaster') as seller_name,
          u.is_verified as seller_is_verified,
          c.name as category_name,
          buyer.name as highest_bidder_name,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
          p.product_source,
          p.real_price
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
        WHERE p.status = 'approved'
          AND p.auction_end_time IS NOT NULL
          AND p.auction_end_time > NOW()
      `;
      const params = [];
      let paramCount = 1;

      // Filter by source: 'company' or 'seller'
      if (normalizedSource === 'company') {
        query += ` AND p.product_source = 'company' `;
      } else if (normalizedSource === 'seller') {
        query += ` AND p.product_source = 'seller' `;
      }

      if (category && category !== 'All' && category !== 'all') {
        const categoryNum = parseInt(category);
        if (!isNaN(categoryNum) && categoryNum.toString() === category.toString()) {
          query += ` AND p.category_id = $${paramCount++} `;
          params.push(categoryNum);
        } else {
          query += ` AND LOWER(c.name) = LOWER($${paramCount}) `;
          params.push(category);
          paramCount++;
        }
      }

      if (search) {
        query += ` AND (p.title ILIKE $${paramCount} OR p.description ILIKE $${paramCount + 1} OR similarity(p.title, $${paramCount + 2}) > 0.2) `;
        params.push(`%${search}%`, `%${search}%`, search);
        paramCount += 3;
      }

      // 🔍 Count query for total items
      let countQuery = `
        SELECT COUNT(*) as count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.seller_id = u.id
        WHERE p.status = 'approved'
          AND p.auction_end_time IS NOT NULL
          AND p.auction_end_time > NOW()
      `;
      const countParams = [];
      let countParamCount = 1;

      if (normalizedSource === 'company') {
        countQuery += ` AND p.product_source = 'company'`;
      } else if (normalizedSource === 'seller') {
        countQuery += ` AND p.product_source = 'seller'`;
      }

      if (category && category !== 'All' && category !== 'all') {
        const categoryNum = parseInt(category);
        if (!isNaN(categoryNum) && categoryNum.toString() === category.toString()) {
          countQuery += ` AND p.category_id = $${countParamCount++}`;
          countParams.push(categoryNum);
        } else {
          countQuery += ` AND LOWER(c.name) = LOWER($${countParamCount})`;
          countParams.push(category);
          countParamCount++;
        }
      }

      if (search) {
        countQuery += ` AND (p.title ILIKE $${countParamCount} OR p.description ILIKE $${countParamCount + 1} OR similarity(p.title, $${countParamCount + 2}) > 0.2)`;
        countParams.push(`%${search}%`, `%${search}%`, search);
        countParamCount += 3;
      }

      // Execute main query and count query in PARALLEL for maximum speed
      const similarityOrder = search ? `similarity(p.title, $${paramCount - 1}) DESC, ` : '';
      const [result, countResult] = await Promise.all([
        pool.query(query + ` ORDER BY ${similarityOrder} p.auction_end_time ASC LIMIT $${paramCount} OFFSET $${paramCount + 1} `, [...params, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]),
        pool.query(countQuery, countParams)
      ]);

      const totalCount = parseInt(countResult.rows[0].count);
      console.log(`✅ [getAllProducts] Success: Found ${result.rows.length} rows, Total: ${totalCount}`);

      // 1. Fix invalid image URLs
      const fixedData = fixImageUrlsInResponse(result.rows);

      // 2. Map and fix data types + add camelCase for Flutter compatibility
      const products = fixedData.map(p => {
        let imagesArray = [];
        try {
          if (p.images && Array.isArray(p.images)) {
            imagesArray = p.images;
          } else if (p.images && typeof p.images === 'string') {
            imagesArray = JSON.parse(p.images);
          }
        } catch (e) {
          imagesArray = p.image_url ? [p.image_url] : [];
        }

        return {
          ...p,
          id: parseInt(p.id) || 0,
          current_bid: Number(p.current_bid || 0),
          current_price: Number(p.current_price || 0),
          starting_price: Number(p.starting_price || 0),
          starting_bid: Number(p.starting_bid || 0),
          total_bids: parseInt(p.total_bids || 0),
          real_price: Number(p.real_price || 0),
          hours_left: p.hours_left ? parseFloat(Number(p.hours_left).toFixed(2)) : 0,
          images: imagesArray,

          // CamelCase aliases
          imageUrl: p.image_url,
          realPrice: Number(p.real_price || 0),
          createdAt: p.created_at,
          productSource: p.product_source,
          auctionEndTime: p.auction_end_time,
          categoryName: p.category_name,
          sellerName: p.seller_name,
          sellerIsVerified: p.seller_is_verified || false,
          categoryId: p.category_id ? parseInt(p.category_id) : null,
          sellerId: p.seller_id ? parseInt(p.seller_id) : null,

          // Nested objects (for new Flutter models)
          category: p.category_id ? {
            id: parseInt(p.category_id),
            name: p.category_name
          } : null,
          seller: p.seller_id ? {
            id: parseInt(p.seller_id),
            name: p.seller_name,
            isVerified: p.seller_is_verified || false
          } : null
        };
      });

      // 3. Return with standard wrapper + pagination
      res.json({
        success: true,
        data: products,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: totalCount > 0 ? Math.ceil(totalCount / limit) : 0
        }
      });
    } catch (error) {
      console.error("❌ [FATAL] Error in getAllProducts:", error.message);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        data: [],
        pagination: { total: 0, page: 1, limit: 20, pages: 0 }
      });
    }
  },

  // GET /api/products/:id
  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          p.*,
          u.name as seller_name,
          u.is_verified as seller_is_verified,
          c.name as category_name,
          buyer.name as highest_bidder_name,
          EXTRACT(EPOCH FROM (p.auction_end_time - NOW())) / 3600 as hours_left,
          CASE 
            WHEN p.auction_end_time > NOW() THEN 'live'
            ELSE 'ended'
          END as auction_status
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users buyer ON p.highest_bidder_id = buyer.id
        WHERE p.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      // Fix invalid image URL in response
      const fixedProduct = fixImageUrlInItem(result.rows[0]);

      // Map types and add aliases
      const finalProduct = {
        ...fixedProduct,
        id: parseInt(fixedProduct.id),
        current_bid: Number(fixedProduct.current_bid || 0),
        current_price: Number(fixedProduct.current_price || 0),
        starting_price: Number(fixedProduct.starting_price || 0),
        starting_bid: Number(fixedProduct.starting_bid || 0),
        total_bids: parseInt(fixedProduct.total_bids || 0),
        real_price: Number(fixedProduct.real_price || 0),
        hours_left: fixedProduct.hours_left ? parseFloat(Number(fixedProduct.hours_left).toFixed(2)) : 0,

        // CamelCase aliases
        imageUrl: fixedProduct.image_url,
        realPrice: Number(fixedProduct.real_price || 0),
        createdAt: fixedProduct.created_at,
        productSource: fixedProduct.product_source,
        auctionEndTime: fixedProduct.auction_end_time,
        categoryName: fixedProduct.category_name,
        sellerName: fixedProduct.seller_name,
        sellerIsVerified: fixedProduct.seller_is_verified || false,
        categoryId: fixedProduct.category_id ? parseInt(fixedProduct.category_id) : null,
        sellerId: fixedProduct.seller_id ? parseInt(fixedProduct.seller_id) : null,

        // Nested objects
        category: fixedProduct.category_id ? { id: parseInt(fixedProduct.category_id), name: fixedProduct.category_name } : null,
        seller: fixedProduct.seller_id ? { id: parseInt(fixedProduct.seller_id), name: fixedProduct.seller_name, isVerified: fixedProduct.seller_is_verified || false } : null
      };

      res.json({
        success: true,
        data: finalProduct
      });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // PUT /api/products/:id - Update product (Seller can edit ONLY their own products)
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { title, description, image_url, startingPrice, real_price, category_id } = req.body;
      const userId = req.user.id;
      const userRole = (req.user.role || '').toLowerCase().trim();

      // Check if product exists
      const productCheck = await pool.query(
        "SELECT id, seller_id, status FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const product = productCheck.rows[0];

      // Permission check: Seller can edit ONLY their own products
      if (userRole === 'seller_products') {
        if (product.seller_id !== userId) {
          return res.status(403).json({
            success: false,
            message: "You can only edit your own products"
          });
        }
      } else if (userRole !== 'superadmin') {
        // Only seller and superadmin can edit
        return res.status(403).json({
          success: false,
          message: "Only sellers can edit their own products, or super admin can edit any product"
        });
      }

      // Build update query
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (title) {
        updates.push(`title = $${paramCount++}`);
        params.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        params.push(description);
      }
      if (image_url !== undefined) {
        const imageUrlValue = Array.isArray(image_url) ? JSON.stringify(image_url) : (image_url || null);
        updates.push(`image_url = $${paramCount++}`);
        params.push(imageUrlValue);
      }
      if (startingPrice !== undefined) {
        const priceParam = paramCount++;
        updates.push(`starting_price = $${priceParam}`);
        updates.push(`starting_bid = $${priceParam}`); // Use same parameter for both
        params.push(startingPrice);
      }
      if (category_id !== undefined) {
        updates.push(`category_id = $${paramCount++}`);
        params.push(category_id);
      }
      if (real_price !== undefined) {
        updates.push(`real_price = $${paramCount++}`);
        params.push(real_price);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No fields to update"
        });
      }

      params.push(id);
      const result = await pool.query(
        `UPDATE products 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        params
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      // Fix image URLs in response
      const fixedProduct = fixImageUrlInItem(result.rows[0]);

      res.json({
        success: true,
        message: "Product updated successfully",
        data: fixedProduct
      });
    } catch (error) {
      console.error("❌ Error updating product:", error);
      console.error("   Product ID:", req.params.id);
      console.error("   User ID:", req.user?.id);
      console.error("   Error details:", error.message);
      console.error("   Stack:", error.stack);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // DELETE /api/products/:id - Delete product (Seller can delete ONLY their own products)
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = (req.user.role || '').toLowerCase().trim();

      // Check if product exists
      const productCheck = await pool.query(
        "SELECT id, seller_id, title FROM products WHERE id = $1",
        [id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const product = productCheck.rows[0];

      // Permission check: Seller can delete ONLY their own products
      if (userRole === 'seller_products') {
        if (product.seller_id !== userId) {
          return res.status(403).json({
            success: false,
            message: "You can only delete your own products"
          });
        }
      } else if (userRole !== 'superadmin') {
        // Only seller and superadmin can delete
        return res.status(403).json({
          success: false,
          message: "Only sellers can delete their own products, or super admin can delete any product"
        });
      }

      // Delete product
      const result = await pool.query(
        "DELETE FROM products WHERE id = $1 RETURNING id, title",
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      res.json({
        success: true,
        message: "Product deleted successfully",
        data: { id: result.rows[0].id, title: result.rows[0].title }
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};

