const mongoose = require('mongoose');

const shelfSchema = new mongoose.Schema({
    shelf_id: {
        type: String,
        required: true,
        unique: true
    }, // ID riêng
    shelf_name: {
        type: String,
        required: true,
        unique: true,
    }, // Tên kệ
    mac_ip: {
        type: String,
        required: true
    },
    user_id: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    location: {
        type: String,
        required: true
    }, // Khu vực
    qr: {
        type: String,
        required: true
    }
}, {
    timestamps: true, // tự động thêm createdAt và updatedAt
});

module.exports = mongoose.model('Shelf', shelfSchema);