// src/controller/oder.controller.js
const Oder = require('../model/Oder');
const OderDetail = require('../model/OderDetail');
const fs = require("fs");
const path = require("path");

// Tạo mới Order cùng details (transaction)
exports.createOrderWithDetails = async (req, res) => {
    const session = await Oder.startSession();
    try {
        await session.startTransaction();

        // 1) Parse body cho cả JSON lẫn multipart
        const body = req.body || {};

        // Debugging: log headers/body/files to diagnose empty orderDetails
        try {
            console.log('DEBUG headers.content-type:', req.headers['content-type']);
            console.log('DEBUG req.body keys:', Object.keys(req.body || {}));
            if (req.rawBody) {
                console.log('DEBUG rawBody (truncated):',
                    typeof req.rawBody === 'string' ? req.rawBody.slice(0, 500) : String(req.rawBody).slice(0, 500));
            }
            console.log('DEBUG has req.file:', !!req.file, 'req.files keys:', req.files ? Object.keys(req.files) : req.files);
        } catch (dbgErr) {
            console.error('Debug log error:', dbgErr && dbgErr.message);
        }

        // ép kiểu số cho tổng bill
        const total_bill =
            body.total_bill !== undefined && body.total_bill !== null ?
            Number(body.total_bill) :
            undefined;

        // parse orderDetails nếu là string (multipart)
        let orderDetailsField = body.orderDetails;
        console.log('DEBUG raw orderDetailsField type:', typeof orderDetailsField);
        if (typeof orderDetailsField !== 'undefined') {
            try {
                console.log('DEBUG raw orderDetailsField (truncated):',
                    (typeof orderDetailsField === 'string' ? orderDetailsField.slice(0, 500) : JSON.stringify(orderDetailsField)));
            } catch (e) {
                // ignore
            }
        }
            if (typeof orderDetailsField === "string") {
                try {
                    orderDetailsField = JSON.parse(orderDetailsField);
                } catch (e) {
                    // Fallback: some clients send JS-like object with single quotes
                    // e.g. '{'product_id': '...', ...}' — try to convert to valid JSON
                    try {
                        const fixed = orderDetailsField.replace(/'/g, '"');
                        orderDetailsField = JSON.parse(fixed);
                        console.log('DEBUG orderDetailsField parsed after quote-fix');
                    } catch (e2) {
                        console.warn('Failed to parse orderDetailsField as JSON:', e.message, '; fallback also failed');
                        orderDetailsField = [];
                    }
                }
        }
        const orderDetails = Array.isArray(orderDetailsField) ?
            orderDetailsField :
            (orderDetailsField ? [orderDetailsField] : []);

        // 2) Chuẩn hóa orderData đúng schema
        const orderData = {
            status: body.status,
            order_code: body.order_code,
            shelf_id: body.shelf_id,
            total_bill: total_bill
        };

        // Validate tối thiểu
        if (!orderData.order_code || !orderData.shelf_id || !Number.isFinite(orderData.total_bill)) {
            return res.status(400).json({
                error: "order_code/shelf_id/total_bill is required"
            });
        }

        // 3) Tạo Order
        const order = await new Oder(orderData).save({
            session
        });

        // 4) Tạo OrderDetails (ép kiểu số cho quantity/price/total_price)
        console.log("DEBUG orderDetails:", JSON.stringify(orderDetails));
        const details = [];
        for (const d of (orderDetails || [])) {
            try {
                const payload = {
                    ...d,
                    order_id: order._id,
                    quantity: d.quantity != null ? Number(d.quantity) : undefined,
                    price: d.price != null ? Number(d.price) : undefined,
                    total_price: d.total_price != null ? Number(d.total_price) : undefined,
                };
                // try save with session; if error, try without session and log
                let saved;
                try {
                    saved = await new OderDetail(payload).save({ session });
                } catch (e) {
                    console.error("Save with session failed, retrying without session:", e.message);
                    saved = await new OderDetail(payload).save();
                }
                details.push(saved);
            } catch (e) {
                console.error("Failed to create order detail for payload:", d, e);
            }
        }

        // 5) Commit trước khi xử lý file (tránh lỗi file làm hỏng transaction)
        await session.commitTransaction();

        // 6) Save ảnh (nếu có). Không ràng buộc transaction.
        try {
            const uploadDir = path.join(__dirname, "..", "..", "public", "uploads", "customers");
            fs.mkdirSync(uploadDir, {
                recursive: true
            });

            // multer.single('receipt_image') => req.file
            // trước khi lưu ảnh:
            let file = req.file;
            if (!file && req.files) {
                file =
                    (req.files.receipt_image && req.files.receipt_image[0]) ||
                    (req.files.customer_image && req.files.customer_image[0]) ||
                    (req.files.file && req.files.file[0]);
            }

            if (file) {
                const originalName = file.originalname || file.name || "";
                const ext = path.extname(originalName || "") || ".jpg";
                const destName = `${order._id.toString()}-${Date.now()}${ext}`;
                const destPath = path.join(uploadDir, destName);

                if (file.path) {
                    fs.renameSync(file.path, destPath);
                } else if (file.buffer) {
                    fs.writeFileSync(destPath, file.buffer);
                }

                const publicPath = `/uploads/customers/${destName}`;
                await Oder.findByIdAndUpdate(order._id, {
                    $set: {
                        customer_image: publicPath
                    }
                });
                order.customer_image = publicPath;
            } else if (req.body.customer_image) {
                const url = String(req.body.customer_image);
                await Oder.findByIdAndUpdate(order._id, {
                    $set: {
                        customer_image: url
                    }
                });
                order.customer_image = url;
            }
        } catch (fileErr) {
            console.error("Customer image save error:", fileErr);
            // không fail response
        }

        // 7) Trả về (dùng toObject để loại metadata mongoose)
        return res.status(201).json({
            order: order.toObject ? order.toObject() : order,
            orderDetails: details.map(d => (d.toObject ? d.toObject() : d)),
        });
    } catch (err) {
        console.error(err);
        try {
            await session.abortTransaction();
        } catch {}
        return res.status(400).json({
            error: err.message
        });
    } finally {
        session.endSession();
    }
};

// Lấy danh sách Order (kèm OrderDetail)
exports.getOrders = async (req, res) => {
    try {
        const orders = await Oder.find().sort({
            createdAt: -1
        });

        const ordersWithDetails = await Promise.all(
            orders.map(async (order) => {
                const details = await OderDetail.find({
                        order_id: order._id
                    })
                    .populate({
                        path: 'product_id',
                        model: 'Product'
                    })
                    .populate({
                        path: 'order_id',
                        model: 'Oder'
                    });
                return {
                    ...order,
                    details
                };
            })
        );

        res.status(200).json({
            success: true,
            data: ordersWithDetails
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders',
            message: err.message
        });
    }
};

// Get order detail by ID
exports.getOrderDetail = async (req, res) => {
    console.log(req.params.id)
    try {
        const orderId = req.params.id;
        const order = await Oder.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        const orderDetails = await OderDetail.find({
                order_id: orderId
            })
            .populate({
                path: 'product_id',
                model: 'Product'
            }) // populate product info
            .populate({
                path: 'order_id',
                model: 'Oder'
            }); // populate order info on each detail

        res.status(200).json({
            success: true,
            data: {
                order,
                details: orderDetails
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order detail',
            message: err.message
        });
    }
};

// Thống kê doanh thu theo thời gian
exports.getRevenueStatistics = async (req, res) => {
    try {
        const { period = 'monthly', year, month, startDate, endDate } = req.query;
        
        let matchStage = {
            status: 'paid' // Chỉ tính đơn hàng đã thanh toán
        };

        // Xây dựng điều kiện lọc theo thời gian
        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (year) {
            const yearInt = parseInt(year);
            if (month) {
                const monthInt = parseInt(month);
                matchStage.createdAt = {
                    $gte: new Date(yearInt, monthInt - 1, 1),
                    $lt: new Date(yearInt, monthInt, 1)
                };
            } else {
                matchStage.createdAt = {
                    $gte: new Date(yearInt, 0, 1),
                    $lt: new Date(yearInt + 1, 0, 1)
                };
            }
        }

        let groupStage;
        if (period === 'daily') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                },
                totalRevenue: { $sum: "$total_bill" },
                orderCount: { $sum: 1 },
                date: { $first: "$createdAt" }
            };
        } else if (period === 'monthly') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                totalRevenue: { $sum: "$total_bill" },
                orderCount: { $sum: 1 },
                date: { $first: "$createdAt" }
            };
        } else if (period === 'yearly') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" }
                },
                totalRevenue: { $sum: "$total_bill" },
                orderCount: { $sum: 1 },
                date: { $first: "$createdAt" }
            };
        }

        const statistics = await Oder.aggregate([
            { $match: matchStage },
            { $group: groupStage },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);

        // Format kết quả
        const formattedStats = statistics.map(stat => ({
            period: stat._id,
            totalRevenue: stat.totalRevenue,
            orderCount: stat.orderCount,
            averageOrderValue: stat.totalRevenue / stat.orderCount,
            date: stat.date
        }));

        // Tính tổng doanh thu và số đơn hàng
        const totalRevenue = statistics.reduce((sum, stat) => sum + stat.totalRevenue, 0);
        const totalOrders = statistics.reduce((sum, stat) => sum + stat.orderCount, 0);

        res.status(200).json({
            success: true,
            data: {
                statistics: formattedStats,
                summary: {
                    totalRevenue,
                    totalOrders,
                    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                    period,
                    dataPoints: statistics.length
                }
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch revenue statistics',
            message: err.message
        });
    }
};

// Thống kê số lượng sản phẩm bán ra
exports.getProductSalesStatistics = async (req, res) => {
    try {
        const { period = 'all', year, month, startDate, endDate, limit = 10 } = req.query;
        
        let matchStage = {
            'order.status': 'paid' // Chỉ tính đơn hàng đã thanh toán
        };

        // Xây dựng điều kiện lọc theo thời gian
        if (startDate && endDate) {
            matchStage['order.createdAt'] = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (year) {
            const yearInt = parseInt(year);
            if (month) {
                const monthInt = parseInt(month);
                matchStage['order.createdAt'] = {
                    $gte: new Date(yearInt, monthInt - 1, 1),
                    $lt: new Date(yearInt, monthInt, 1)
                };
            } else {
                matchStage['order.createdAt'] = {
                    $gte: new Date(yearInt, 0, 1),
                    $lt: new Date(yearInt + 1, 0, 1)
                };
            }
        }

        const productStats = await OderDetail.aggregate([
            // Lookup để join với Order
            {
                $lookup: {
                    from: 'oders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            { $unwind: '$order' },
            { $match: matchStage },
            // Lookup để join với Product
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            // Group theo sản phẩm
            {
                $group: {
                    _id: '$product_id',
                    productName: { $first: '$product.product_name' },
                    productCode: { $first: '$product.product_code' },
                    category: { $first: '$product.category' },
                    totalQuantitySold: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$total_price' },
                    orderCount: { $sum: 1 },
                    averagePrice: { $avg: '$price' },
                    lastSaleDate: { $max: '$order.createdAt' }
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: parseInt(limit) }
        ]);

        // Thống kê tổng quan
        const overallStats = await OderDetail.aggregate([
            {
                $lookup: {
                    from: 'oders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            { $unwind: '$order' },
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalProductsSold: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$total_price' },
                    uniqueProducts: { $addToSet: '$product_id' },
                    totalOrders: { $addToSet: '$order_id' }
                }
            }
        ]);

        const summary = overallStats[0] || {
            totalProductsSold: 0,
            totalRevenue: 0,
            uniqueProducts: [],
            totalOrders: []
        };

        res.status(200).json({
            success: true,
            data: {
                productStatistics: productStats,
                summary: {
                    totalProductsSold: summary.totalProductsSold,
                    totalRevenue: summary.totalRevenue,
                    uniqueProductCount: summary.uniqueProducts.length,
                    uniqueOrderCount: summary.totalOrders.length,
                    averageQuantityPerOrder: summary.uniqueOrderCount > 0 
                        ? summary.totalProductsSold / summary.uniqueOrderCount : 0
                },
                period,
                limit: parseInt(limit)
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch product sales statistics',
            message: err.message
        });
    }
};

// Thống kê top sản phẩm bán chạy
exports.getTopSellingProducts = async (req, res) => {
    try {
        const { limit = 5, period = 'all', year, month } = req.query;
        
        let matchStage = {
            'order.status': 'paid'
        };

        // Xây dựng điều kiện lọc theo thời gian
        if (year) {
            const yearInt = parseInt(year);
            if (month) {
                const monthInt = parseInt(month);
                matchStage['order.createdAt'] = {
                    $gte: new Date(yearInt, monthInt - 1, 1),
                    $lt: new Date(yearInt, monthInt, 1)
                };
            } else {
                matchStage['order.createdAt'] = {
                    $gte: new Date(yearInt, 0, 1),
                    $lt: new Date(yearInt + 1, 0, 1)
                };
            }
        }

        const topProducts = await OderDetail.aggregate([
            {
                $lookup: {
                    from: 'oders',
                    localField: 'order_id',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            { $unwind: '$order' },
            { $match: matchStage },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $group: {
                    _id: '$product_id',
                    productName: { $first: '$product.product_name' },
                    productCode: { $first: '$product.product_code' },
                    totalQuantitySold: { $sum: '$quantity' },
                    totalRevenue: { $sum: '$total_price' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: parseInt(limit) }
        ]);

        res.status(200).json({
            success: true,
            data: topProducts
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top selling products',
            message: err.message
        });
    }
};