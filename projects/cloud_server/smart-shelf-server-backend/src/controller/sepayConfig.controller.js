const mongoose = require('mongoose');
const SepayConfig = require('../model/SepayConfig');

function sanitizePayload(body = {}) {
  const update = {};
  const stringFields = [
    'vietqrAccountNo',
    'vietqrAccountName',
    'vietqrAcqId',
    'sepayAuthToken',
    'sepayBankAccountId',
    // Legacy fields
    'apiKey',
    'apiSecret',
    'merchantCode',
    'webhookUrl',
    'callbackUrl',
    'shelf_id',
  ];

  stringFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const value = body[field];
      if (value !== undefined && value !== null) update[field] = String(value).trim();
    }
  });

  // cast shelf_id to ObjectId if valid
  if (update.shelf_id) {
    if (mongoose.Types.ObjectId.isValid(update.shelf_id)) {
      update.shelf_id = new mongoose.Types.ObjectId(update.shelf_id);
    } else {
      // invalid id -> remove to avoid cast error
      delete update.shelf_id;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'sandbox')) {
    update.sandbox = Boolean(body.sandbox);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'active')) {
    update.active = Boolean(body.active);
  }

  return update;
}

exports.getConfig = async (req, res) => {
  try {
    const config = await SepayConfig.findOne();
    if (!config) {
      return res.status(404).json({ error: 'Sepay config not found' });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConfigByShelfId = async (req, res) => {
  try {
    const { shelfId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shelfId)) {
      return res.status(400).json({ error: 'Invalid shelfId' });
    }
    const config = await SepayConfig.findOne({ shelf_id: new mongoose.Types.ObjectId(shelfId) });
    if (!config) {
      return res.status(404).json({ error: 'Sepay config for shelf not found' });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertConfig = async (req, res) => {
  try {
    const update = sanitizePayload(req.body);
    if (!Object.keys(update).length) {
      return res.status(400).json({ error: 'No fields provided' });
    }

    const config = await SepayConfig.findOneAndUpdate({}, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    });

    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/sepay-config/shelf/:shelfId - Tạo hoặc update config cho shelf cụ thể
exports.upsertConfigByShelfId = async (req, res) => {
  try {
    const { shelfId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shelfId)) {
      return res.status(400).json({ error: 'Invalid shelfId' });
    }

    const update = sanitizePayload(req.body);
    // force shelf_id từ params
    update.shelf_id = new mongoose.Types.ObjectId(shelfId);

    const config = await SepayConfig.findOneAndUpdate(
      { shelf_id: update.shelf_id },
      update,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/sepay-config/:id - Xóa config theo ID
exports.deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }

    const config = await SepayConfig.findByIdAndDelete(id);
    if (!config) {
      return res.status(404).json({ error: 'Sepay config not found' });
    }

    res.json({ message: 'Sepay config deleted successfully', data: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/sepay-config/shelf/:shelfId - Xóa config theo shelf ID
exports.deleteConfigByShelfId = async (req, res) => {
  try {
    const { shelfId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shelfId)) {
      return res.status(400).json({ error: 'Invalid shelfId' });
    }

    const config = await SepayConfig.findOneAndDelete({ shelf_id: new mongoose.Types.ObjectId(shelfId) });
    if (!config) {
      return res.status(404).json({ error: 'Sepay config for shelf not found' });
    }

    res.json({ message: 'Sepay config deleted successfully', data: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
