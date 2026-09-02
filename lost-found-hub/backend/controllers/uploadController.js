/**
 * POST /api/upload
 * Accepts a single image file (field name "image") and returns its public URL.
 * The actual file lives in backend/uploads and is served statically at /uploads/<filename>.
 */
function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image file received" });
  }

  const publicUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({
    success: true,
    data: {
      url: publicUrl,
      filename: req.file.filename,
      size: req.file.size,
    },
  });
}

module.exports = { uploadImage };
