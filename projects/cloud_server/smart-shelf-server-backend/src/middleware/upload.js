// middlewares/upload.js
const multer = require("multer");
const path = require("path");
const { storage } = require("../config/cloudinary");

// Check File Type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

// Init Upload with Cloudinary storage
const upload = multer({
  storage, // Use Cloudinary storage from config
  limits: { fileSize: 100000000 }, // 100MB limit
  fileFilter: (req, file, cb) => checkFileType(file, cb),
}).fields([
  { name: "image", maxCount: 1 },
  { name: "img_url", maxCount: 1 },
]);

// Conditional multer middleware for avatar upload
const conditionalMulter = multer({
  storage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: (req, file, cb) => checkFileType(file, cb),
}).single('avatar');

module.exports = { upload, conditionalMulter };