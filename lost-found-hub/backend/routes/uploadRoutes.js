const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = require("../middleware/upload");
const { uploadImage } = require("../controllers/uploadController");

// POST /api/upload  (multipart/form-data, field name "image")
router.post("/", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE" ? "Image must be smaller than 5MB" : err.message;
      return res.status(400).json({ success: false, message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, uploadImage);

module.exports = router;
