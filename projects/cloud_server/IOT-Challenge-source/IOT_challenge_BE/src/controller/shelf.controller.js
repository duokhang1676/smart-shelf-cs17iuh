const mongoose = require("mongoose");
const Shelf = require("../model/Shelf");
const LoadCell = require("../model/LoadCell");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// Import helpers từ utils (TS/JS tuỳ vào build của bạn)
const { normalizeUserArray, coerceUserIdToObjectIdArray } = require("../utils/coerceUserIdToObjectIdArray.ts");

// GET /shelves
exports.getAllShelves = async (req, res) => {
  try {
    const shelves = await Shelf.find().populate({
      path: "user_id",
      model: "User",
      select: "-password -__v",
    });
    res.json(shelves.map(normalizeUserArray));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shelves", message: err.message });
  }
};

// GET /shelves/:id
exports.getShelfById = async (req, res) => {
  try {
    const shelf = await Shelf.findById(req.params.id).populate({
      path: "user_id",
      model: "User",
      select: "-password -__v",
    });
    if (!shelf) {
      return res.status(404).json({
        error: "Shelf not found",
        message: `Shelf with ID ${req.params.id} does not exist.`,
      });
    }
    res.status(200).json(normalizeUserArray(shelf));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shelf", message: err.message });
  }
};

// POST /shelves
exports.createShelf = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const payload = coerceUserIdToObjectIdArray(req.body);

    // avoid duplicate shelf id early
    const existing = await Shelf.findOne({ shelf_id: payload.shelf_id }).lean();
    if (existing) {
      return res.status(400).json({
        error: "Shelf already exists",
        message: `Shelf ID ${payload.shelf_id} already exists.`,
      });
    }

    let createdShelf = null;

    await session.withTransaction(async () => {
      const shelfDoc = new Shelf(payload);
      await shelfDoc.save({ session });

      // Khởi tạo 15 load cells (3 tầng x 5 cột)
      const loadCells = [];
      const FLOORS = 3;
      const COLUMNS = 5;
      let idx = 1;
      for (let floor = 1; floor <= FLOORS; floor++) {
        for (let column = 1; column <= COLUMNS; column++) {
          loadCells.push({
            load_cell_id: idx++,
            load_cell_name: `LC-${floor}-${column}`,
            // ensure null, not empty string
            product_id: null,
            shelf_id: shelfDoc._id,
            quantity: 0,
            floor,
            column,
          });
        }
      }
      // insertMany with session
      await LoadCell.insertMany(loadCells, { session });

      // set createdShelf for returning after commit
      createdShelf = shelfDoc;
    });

    // End session before file IO / populate (withTransaction committed)
    session.endSession();

    // generate QR file for shelf and update shelf.qr
    try {
      // use public/uploads/qr so files được phục vụ từ public
      const uploadDir = path.join(__dirname, "..", "..", "public", "uploads", "qr");
      fs.mkdirSync(uploadDir, { recursive: true });

      // Use DB _id as filename so it's unique and stable
      const qrFileName = `${createdShelf._id.toString()}.png`;
      const qrFilePath = path.join(uploadDir, qrFileName);

      // build QR content that includes shelf _id and user_id(s)
      const userIds =
        Array.isArray(createdShelf.user_id) && createdShelf.user_id.length
          ? createdShelf.user_id.map((u) => String(u)).join(",")
          : String(createdShelf.user_id || "");

      const qrPayload = {
        _id: String(createdShelf._id),
        user_id: userIds,
      };
      const qrContent = JSON.stringify(qrPayload);

      await QRCode.toFile(qrFilePath, qrContent, { width: 300 });

      // store accessible path in DB (use /uploads/qr/... served from public)
      const publicPath = `/uploads/qr/${qrFileName}`;
      await Shelf.findByIdAndUpdate(createdShelf._id, { $set: { qr: publicPath } });
      createdShelf.qr = publicPath;
    } catch (e) {
      console.error("QR generation error:", e);
    }

    // populate outside transaction
    const populated = await Shelf.findById(createdShelf._id).populate({
      path: "user_id",
      model: "User",
      select: "-password -__v",
    });

    res.status(201).json({
      shelf: normalizeUserArray(populated),
      message: "Shelf and 15 load cells created successfully.",
    });
  } catch (err) {
    // ensure session ended
    try { session.endSession(); } catch (e) {}
    res.status(400).json({ error: "Failed to create shelf or load cells", message: err.message });
  }
};

// PATCH /shelves/:id
exports.updateShelf = async (req, res) => {
  try {
    const updateData = coerceUserIdToObjectIdArray(req.body);

    // update shelf first
    let shelf = await Shelf.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).populate({ path: "user_id", model: "User", select: "-password -__v" });

    if (!shelf) return res.status(404).json({ error: "Shelf not found" });

    // regenerate QR based on _id and user_id (updateShelf)
    try {
      const uploadDir = path.join(__dirname, "..", "..", "public", "uploads", "qr");
      fs.mkdirSync(uploadDir, { recursive: true });

      const qrFileName = `${shelf._id.toString()}.png`;
      const qrFilePath = path.join(uploadDir, qrFileName);

      const userIds =
        Array.isArray(shelf.user_id) && shelf.user_id.length
          ? shelf.user_id.map((u) => String(u)).join(",")
          : String(shelf.user_id || "");

      const qrPayload = {
        _id: String(shelf._id),
        user_id: userIds,
      };
      const qrContent = JSON.stringify(qrPayload);

      await QRCode.toFile(qrFilePath, qrContent, { width: 300 });

      const publicPath = `/uploads/qr/${qrFileName}`;
      await Shelf.findByIdAndUpdate(shelf._id, { $set: { qr: publicPath } });
      // refresh shelf with populated user_id
      shelf = await Shelf.findById(shelf._id).populate({
        path: "user_id",
        model: "User",
        select: "-password -__v",
      });
    } catch (e) {
      console.error("QR generation error (updateShelf):", e);
    }

    res.json(normalizeUserArray(shelf));
  } catch (err) {
    res.status(400).json({ error: "Failed to update shelf", message: err.message });
  }
};


// DELETE /shelves/:id
exports.deleteShelf = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // remove loadcells belonging to shelf first
      await LoadCell.deleteMany({ shelf_id: req.params.id }).session(session);
      // then remove shelf
      const deleted = await Shelf.findByIdAndDelete(req.params.id, { session });
      if (!deleted) throw new Error("Shelf not found");
    });
    session.endSession();
    res.json({ message: "Shelf and associated load cells deleted successfully" });
  } catch (err) {
    try { session.endSession(); } catch (e) {}
    res.status(500).json({ error: "Failed to delete shelf", message: err.message });
  }
};

// GET /shelves/:shelfId/products
exports.getProductsByShelfId = async (req, res) => {
  try {
    const shelfId = req.params.shelfId;

    const shelf = await Shelf.findById(shelfId);
    if (!shelf) {
      return res.status(404).json({
        error: "Shelf not found",
        message: `Shelf with ID ${shelfId} does not exist.`,
      });
    }

    const loadCells = await LoadCell.find({ shelf_id: shelfId })
      .select("product_id quantity floor column")
      .populate({
        path: "product_id",
        select: "product_name price discount max_quantity weight img_url",
        model: "Product",
      })
      .sort({ floor: 1, column: 1 })
      .lean();

    const products = loadCells.map((cell) => {
      if (!cell.product_id) {
        return {
          product_id: null,
          product_name: null,
          price: null,
          discount: null,
          max_quantity: null,
          weight: null,
          img_url: null,
          quantity: cell.quantity,
          floor: cell.floor,
          column: cell.column,
        };
      }
      return {
        product_id: cell.product_id._id || cell.product_id,
        product_name: cell.product_id.product_name,
        price: cell.product_id.price,
        discount: cell.product_id.discount,
        max_quantity: cell.product_id.max_quantity,
        weight: cell.product_id.weight,
        img_url: cell.product_id.img_url,
        quantity: cell.quantity,
        floor: cell.floor,
        column: cell.column,
      };
    });

    res.status(200).json({
      shelf: { shelf_id: shelf.shelf_id, _id: shelf._id },
      products,
      message: "Products retrieved successfully.",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products", message: err.message });
  }
};

// GET /shelves/:shelfId/loadcells
exports.getLoadsellByShelfId = async (req, res) => {
  try {
    const shelfId = req.params.shelfId;

    const shelf = await Shelf.findById(shelfId);
    if (!shelf) {
      return res.status(404).json({
        error: "Shelf not found",
        message: `Shelf with ID ${shelfId} does not exist.`,
      });
    }

    const loadCells = await LoadCell.find({ shelf_id: shelfId })
      .select(
        "_id load_cell_id load_cell_name product_id previous_product_id product_name shelf_id quantity floor column threshold error"
      )
      .lean();

    if (!loadCells || loadCells.length === 0) {
      return res.status(404).json({
        error: "No load cells found",
        message: `No load cells found for shelf ID ${shelfId}.`,
      });
    }

    res.status(200).json({
      shelf: { shelf_id: shelf.shelf_id, _id: shelf._id },
      loadCells,
      message: "Load cells retrieved successfully.",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch load cells", message: err.message });
  }
};

// GET /shelves/:shelfId/employees
exports.getEmployee = async (req, res) => {
  try {
    const shelfId = req.params.shelfId;

    const shelf = await Shelf.findById(shelfId).populate({
      path: "user_id",
      select: "username role rfid fullName _id",
      model: "User",
    });


    if (!shelf) {
      return res.status(404).json({
        error: "Shelf not found",
        message: `Shelf with ID ${shelfId} does not exist.`,
      });
    }

    const users = normalizeUserArray(shelf).user_id;

    if (!users.length) {
      return res.status(200).json({
        shelf_id: shelf.shelf_id,
        users: [],
        message: "No users assigned yet.",
      });
    }

    const usersSafe = users.map((u) => {
      const o = typeof u.toObject === "function" ? u.toObject() : u;
      delete o.password;
      delete o.__v;
      return {
        _id: o._id,
        username: o.username,
        fullName: o.fullName,
        role: o.role,
        rfid: o.rfid,
      };
    });

    return res.status(200).json({
      shelf_id: shelf.shelf_id,
      users: usersSafe,
      message: "Users retrieved successfully.",
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user", message: err.message });
  }
};

// PATCH /shelves/:id/assign-users  { user_id: string|string[] }
exports.assignUsers = async (req, res) => {
  try {
    const objPayload = coerceUserIdToObjectIdArray(req.body);
    const ids = objPayload && Array.isArray(objPayload.user_id) ? objPayload.user_id : [];
    const updated = await Shelf.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { user_id: { $each: ids } } },
      { new: true }
    ).populate({ path: "user_id", model: "User", select: "-password -__v" });

    if (!updated) return res.status(404).json({ error: "Shelf not found" });

    res.json({
      shelf: normalizeUserArray(updated),
      message: `Assigned ${ids.length} user(s) to shelf.`,
    });
  } catch (e) {
    res.status(400).json({ error: "Failed to assign users", message: e.message });
  }
};

// PATCH /shelves/:id/remove-users  { user_id: string|string[] }
exports.removeUsers = async (req, res) => {
  try {
    const objPayload = coerceUserIdToObjectIdArray(req.body);
    const ids = objPayload && Array.isArray(objPayload.user_id) ? objPayload.user_id : [];

    const updated = await Shelf.findByIdAndUpdate(
      req.params.id,
      { $pullAll: { user_id: ids } },
      { new: true }
    ).populate({ path: "user_id", model: "User", select: "-password -__v" });

    if (!updated) return res.status(404).json({ error: "Shelf not found" });

    res.json({
      shelf: normalizeUserArray(updated),
      message: `Removed ${ids.length} user(s) from shelf.`,
    });
  } catch (e) {
    res.status(400).json({ error: "Failed to remove users", message: e.message });
  }
};

exports.getQR = async (req, res) => {
  try {
    const shelves = await Shelf.find().populate({
      path: "user_id",
      model: "User",
      select: "-password -__v",
    });

    const result = shelves.map((shelf) => {
      const qr_url = shelf.qr
      return { qr_url };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch shelves", message: err.message });
  }
};