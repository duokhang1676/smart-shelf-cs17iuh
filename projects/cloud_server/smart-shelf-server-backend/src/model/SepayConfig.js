const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption key from environment variable
const ENCRYPTION_KEY = process.env.SEPAY_ENCRYPTION_KEY || 'your-32-character-secret-key!!'; // Must be 32 characters
const ALGORITHM = 'aes-256-cbc';

// Encryption function
function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decryption function
function decrypt(text) {
  if (!text) return '';
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return '';
  }
}

const sepayConfigSchema = new mongoose.Schema(
  {
    // Reference to Shelf
    shelf_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shelf',
      index: true,
    },
    
    // VietQR Information
    vietqrAccountNo: {
      type: String,
      required: true,
      trim: true,
    },
    vietqrAccountName: {
      type: String,
      required: true,
      trim: true,
    },
    vietqrAcqId: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Sepay Configuration (encrypted)
    sepayAuthToken: {
      type: String,
      required: true,
      set: encrypt, // Auto-encrypt when saving
      get: decrypt, // Auto-decrypt when retrieving
    },
    sepayBankAccountId: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Legacy fields (optional for backward compatibility)
    apiKey: {
      type: String,
      trim: true,
    },
    apiSecret: {
      type: String,
      trim: true,
    },
    merchantCode: {
      type: String,
      trim: true,
    },
    webhookUrl: {
      type: String,
      trim: true,
    },
    callbackUrl: {
      type: String,
      trim: true,
    },
    
    // Status fields
    sandbox: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { getters: true }, // Enable getters when converting to JSON
    toObject: { getters: true },
  }
);

// Virtual field to get last update time
sepayConfigSchema.virtual('lastUpdated').get(function() {
  return this.updatedAt;
});

module.exports = mongoose.model('SepayConfig', sepayConfigSchema);
