const Item = require("../models/Item");

/**
 * GET /api/items
 * Get all items, with optional search + filters via query params:
 *   ?search=wallet&category=Bags&status=Lost&sort=newest&page=1&limit=12
 */
async function getItems(req, res) {
  const { search, category, status, sort, page = 1, limit = 100 } = req.query;

  const query = {};

  if (search && search.trim()) {
    query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
      { location: { $regex: search.trim(), $options: "i" } },
    ];
  }

  if (category && category !== "All") {
    query.category = category;
  }

  if (status && status !== "All") {
    query.status = status;
  }

  let sortOption = { createdAt: -1 }; // newest first by default
  if (sort === "oldest") sortOption = { createdAt: 1 };
  if (sort === "az") sortOption = { title: 1 };

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(parseInt(limit, 10) || 100, 200);
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Item.find(query).sort(sortOption).skip(skip).limit(limitNum),
    Item.countDocuments(query),
  ]);

  res.json({
    success: true,
    count: items.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    data: items,
  });
}

/**
 * GET /api/items/:id
 * Get single item details
 */
async function getItemById(req, res) {
  const item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }
  res.json({ success: true, data: item });
}

/**
 * POST /api/items
 * Report a new lost or found item
 */
async function createItem(req, res) {
  const {
    title,
    description,
    category,
    status,
    location,
    date,
    reporterName,
    reporterEmail,
    reporterPhone,
    imageUrl,
  } = req.body;

  // Basic server-side validation (defense in depth; client also validates)
  const requiredFields = { title, description, category, status, location, reporterName, reporterEmail };
  const missing = Object.entries(requiredFields)
    .filter(([, v]) => !v || !String(v).trim())
    .map(([k]) => k);

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: `Missing required field(s): ${missing.join(", ")}`,
    });
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(reporterEmail)) {
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }

  if (!["Lost", "Found", "Claimed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status value" });
  }

  const item = await Item.create({
    title: title.trim(),
    description: description.trim(),
    category,
    status,
    location: location.trim(),
    date: date ? new Date(date) : Date.now(),
    reporterName: reporterName.trim(),
    reporterEmail: reporterEmail.trim().toLowerCase(),
    reporterPhone: reporterPhone ? reporterPhone.trim() : "",
    imageUrl: imageUrl ? imageUrl.trim() : "",
  });

  res.status(201).json({ success: true, data: item });
}

/**
 * PUT /api/items/:id
 * Update an item (e.g., edit details or change status manually)
 */
async function updateItem(req, res) {
  const item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }

  const allowedFields = [
    "title",
    "description",
    "category",
    "status",
    "location",
    "date",
    "reporterName",
    "reporterEmail",
    "reporterPhone",
    "imageUrl",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  });

  await item.save();
  res.json({ success: true, data: item });
}

/**
 * PATCH /api/items/:id/claim
 * Mark an item as Claimed and store claimant info
 */
async function claimItem(req, res) {
  const { name, email, note } = req.body;

  if (!name || !name.trim() || !email || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Claimant name and email are required",
    });
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email address" });
  }

  const item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }

  if (item.status === "Claimed") {
    return res.status(400).json({ success: false, message: "Item has already been claimed" });
  }

  item.status = "Claimed";
  item.claimedBy = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    claimedAt: new Date(),
    note: note ? note.trim() : "",
  };

  await item.save();
  res.json({ success: true, message: "Item marked as claimed", data: item });
}

/**
 * DELETE /api/items/:id
 * Delete an item listing
 */
async function deleteItem(req, res) {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }
  res.json({ success: true, message: "Item deleted" });
}

/**
 * GET /api/items/stats/summary
 * Quick counts for the hero/stat bar
 */
async function getStats(req, res) {
  const [lost, found, claimed, total] = await Promise.all([
    Item.countDocuments({ status: "Lost" }),
    Item.countDocuments({ status: "Found" }),
    Item.countDocuments({ status: "Claimed" }),
    Item.countDocuments({}),
  ]);

  res.json({ success: true, data: { lost, found, claimed, total } });
}

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  claimItem,
  deleteItem,
  getStats,
};
