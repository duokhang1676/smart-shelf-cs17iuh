const mongoose = require("mongoose");
const { Types } = mongoose;

/**
 * NOTE: file kept as .ts for typing in editor, but using CommonJS require/exports
 * so Node (without "type":"module") can run it. If you want ESM, set
 * "type": "module" in package.json and revert to import/export syntax.
 */

 /**
  * ShelfLike type (JSDoc used so TS still understands shape)
  * @typedef {{ user_id?: import('mongoose').Types.ObjectId[] | import('mongoose').Types.ObjectId | string | null, toObject?: () => any, [key:string]: any }} ShelfLike
  */

/**
 * Chuẩn hoá user_id thành luôn luôn là mảng.
 * Nếu doc có .toObject() (Document) thì convert sang plain object trước.
 * @template T
 * @param {T|null} doc
 * @returns {T|null}
 */
function normalizeUserArray(doc) {
  if (!doc) return doc;

  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;

  obj.user_id = Array.isArray(obj.user_id)
    ? obj.user_id
    : obj.user_id
    ? [obj.user_id]
    : [];

  return obj;
}

/**
 * Ép payload.user_id -> MẢNG ObjectId (bỏ qua phần tử không hợp lệ).
 * Dùng khi create/update/assign để đảm bảo populate hoạt động đúng.
 * @template T
 * @param {T} payload
 * @returns {T}
 */
function coerceUserIdToObjectIdArray(payload) {
  if (!payload) return payload;

  const out = { ...payload };
  if (!("user_id" in out)) return out;

  const arr = Array.isArray(out.user_id)
    ? out.user_id
    : out.user_id != null
    ? [out.user_id]
    : [];

  out.user_id = arr
    .map((x) => (x == null ? null : String(x)))
    .filter(Boolean)
    .map((x) => (Types.ObjectId.isValid(x) ? new Types.ObjectId(x) : null))
    .filter(Boolean);

  return out;
}

module.exports = {
  normalizeUserArray,
  coerceUserIdToObjectIdArray,
};
