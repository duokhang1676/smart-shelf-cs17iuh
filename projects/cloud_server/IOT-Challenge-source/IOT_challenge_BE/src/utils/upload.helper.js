const path = require("path");

function pickUploadedFile(req) {
  // single -> req.file
  if (req.file) return req.file;
  // fields -> req.files: { field: [file,...], ... }
  const files = req.files || {};
  if (files.image && Array.isArray(files.image) && files.image.length) return files.image[0];
  if (files.img_url && Array.isArray(files.img_url) && files.img_url.length) return files.img_url[0];
  // fallback: first file in object
  for (const k of Object.keys(files)) {
    if (Array.isArray(files[k]) && files[k].length) return files[k][0];
  }
  return null;
}

function buildFileUrl(file) {
  if (!file) return "";
  const host = (process.env.APP_ADDRESS || "").replace(/\/$/, "");
  // if filename already a full url, return
  if (String(file.filename).startsWith("http") || String(file.path).startsWith("http")) {
    return file.filename || file.path;
  }
  // prefer /uploads/<filename>
  return host ? `/uploads/${file.filename}` : `/uploads/${file.filename}`;
}

module.exports = {
  pickUploadedFile,
  buildFileUrl,
};