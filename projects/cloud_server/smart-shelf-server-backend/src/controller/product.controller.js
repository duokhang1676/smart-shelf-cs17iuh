const Product = require("../model/Product");
const LoadCell = require("../model/LoadCell");
const History = require("../model/History");
const OderDetail = require("../model/OderDetail");
const { pickUploadedFile, buildFileUrl } = require("../utils/upload.helper");

// helper: generate short unique product_id
async function generateUniqueProductId() {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    // example id: P-<timestamp>-<4chars>
    const candidate =
      "P-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    // check uniqueness
    const exists = await Product.findOne({ product_id: candidate }).lean();
    if (!exists) return candidate;
  }
  // fallback to mongo ObjectId string if random generation keeps colliding
  return require("mongoose").Types.ObjectId().toString();
}

exports.createProduct = async (req, res) => {
  try {
    const file = pickUploadedFile(req);

    // read body fields (strings may come from form-data)
    const {
      product_id: bodyProductId,
      product_name,
      price,
      stock,
      img_url: bodyImgUrl,
      discount,
      weight,
      max_quantity,
    } = req.body || {};

    // determine img_url
    const img_url = file
      ? buildFileUrl(file)
      : bodyImgUrl && String(bodyImgUrl).trim()
      ? String(bodyImgUrl).trim()
      : "/uploads/default.png";

    // prepare numeric conversions with safe defaults
    const parsedPrice = price !== undefined ? Number(price) : 0;
    // Stock sẽ tự động tính từ LoadCells, không cần nhập thủ công
    const parsedStock = 0; // Luôn khởi tạo = 0, sẽ tự động tính khi có LoadCells
    const parsedDiscount = discount !== undefined ? Number(discount) : 0;
    const parsedWeight = weight !== undefined ? Number(weight) : 0;
    const parsedMaxQuantity = max_quantity !== undefined ? Number(max_quantity) : 0;

    // product_id: use provided if non-empty, otherwise generate unique
    let product_id = bodyProductId && String(bodyProductId).trim() ? String(bodyProductId).trim() : "";
    if (!product_id) {
      product_id = await generateUniqueProductId();
    } else {
      // ensure provided product_id is unique
      const exists = await Product.findOne({ product_id }).lean();
      if (exists) {
        return res.status(400).json({ error: "product_id already exists" });
      }
    }

    const product = new Product({
      product_id,
      product_name: product_name ?? "",
      img_url,
      price: parsedPrice,
      stock: parsedStock,
      discount: parsedDiscount,
      weight: parsedWeight,
      max_quantity: parsedMaxQuantity,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    // Lấy tất cả sản phẩm
    const products = await Product.find().lean();
    
    // Tính tổng số lượng từ LoadCells, History và OderDetail cho mỗi sản phẩm
    const productsWithCalculatedStock = await Promise.all(
      products.map(async (product) => {
        // Tính stock từ LoadCells
        const loadCellsAggregation = await LoadCell.aggregate([
          { $match: { product_id: product._id } },
          { $group: { _id: null, totalQuantity: { $sum: "$quantity" } } }
        ]);
        const calculatedStock = loadCellsAggregation.length > 0 
          ? loadCellsAggregation[0].totalQuantity 
          : 0;
        
        // Tính in_stock từ History (tổng post_verified_quantity cho sản phẩm)
        const historyAggregation = await History.aggregate([
          { $unwind: { path: "$post_products", includeArrayIndex: "productIndex" } },
          { $match: { "post_products": product._id } },
          { $addFields: { quantity: { $arrayElemAt: ["$post_verified_quantity", "$productIndex"] } } },
          { $group: { _id: null, totalInStock: { $sum: "$quantity" } } }
        ]);
        const inStock = historyAggregation.length > 0 ? historyAggregation[0].totalInStock : 0;
        
        // Tính out_stock từ OderDetail (tổng quantity)
        const orderDetailAggregation = await OderDetail.aggregate([
          { $match: { product_id: product._id } },
          { $group: { _id: null, totalOutStock: { $sum: "$quantity" } } }
        ]);
        const outStock = orderDetailAggregation.length > 0 ? orderDetailAggregation[0].totalOutStock : 0;
        
        return {
          ...product,
          stock: calculatedStock, // Stock hiện tại từ LoadCells
          in_stock: inStock, // Tổng nhập từ History
          out_stock: outStock, // Tổng xuất từ OderDetail
        };
      })
    );
    
    res.json(productsWithCalculatedStock);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const file = pickUploadedFile(req);

    if (file) updateData.img_url = buildFileUrl(file);
    else if (Object.prototype.hasOwnProperty.call(req.body, "img_url")) {
      const b = String(req.body.img_url || "").trim();
      updateData.img_url = b ? b : "/uploads/default.png";
    }

    // convert numeric fields if present
    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    // KHÔNG CHO PHÉP update stock - stock tự động tính từ LoadCells
    delete updateData.stock; // Xóa stock khỏi updateData nếu có
    if (updateData.discount !== undefined) updateData.discount = Number(updateData.discount);
    if (updateData.weight !== undefined) updateData.weight = Number(updateData.weight);
    if (updateData.max_quantity !== undefined) updateData.max_quantity = Number(updateData.max_quantity);

    // if updating product_id, ensure uniqueness
    if (updateData.product_id) {
      const existing = await Product.findOne({ product_id: updateData.product_id }).lean();
      if (existing && String(existing._id) !== String(req.params.id)) {
        return res.status(400).json({ error: "product_id already exists" });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    
    // Tính lại stock từ LoadCells
    const LoadCell = require("../model/LoadCell");
    const loadCellsAggregation = await LoadCell.aggregate([
      { $match: { product_id: product._id } },
      { $group: { _id: null, totalQuantity: { $sum: "$quantity" } } }
    ]);
    
    const calculatedStock = loadCellsAggregation.length > 0 
      ? loadCellsAggregation[0].totalQuantity 
      : 0;
    
    const productWithCalculatedStock = product.toObject();
    productWithCalculatedStock.stock = calculatedStock;
    
    res.json(productWithCalculatedStock);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};