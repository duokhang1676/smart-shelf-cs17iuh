const mongoose = require("mongoose");
const {
    Schema
} = mongoose;

const HistorySchema = new Schema({
    notes: {
        type: String,
        default: ""
    },
    
    shelf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shelf",
        require: true,
    },

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    pre_products: [{
        type: Schema.Types.ObjectId,
        ref: "Product"
    }],
    post_products: [{
        type: Schema.Types.ObjectId,
        ref: "Product"
    }],

    pre_verified_quantity: [{
        type: Number
    }],

    post_verified_quantity: [{
        type: Number
    }],
}, {
    timestamps: true
});

module.exports = mongoose.model("History", HistorySchema);