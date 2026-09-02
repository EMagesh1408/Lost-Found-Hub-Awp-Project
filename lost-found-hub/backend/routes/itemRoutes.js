const express = require("express");
const router = express.Router();
const {
  getItems,
  getItemById,
  createItem,
  updateItem,
  claimItem,
  deleteItem,
  getStats,
} = require("../controllers/itemController");

// GET /api/items/stats/summary  -> dashboard counts (must come before /:id)
router.get("/stats/summary", getStats);

// GET /api/items?search=&category=&status=&sort=  -> list + search/filter
router.get("/", getItems);

// POST /api/items -> report a new lost/found item
router.post("/", createItem);

// GET /api/items/:id -> item details
router.get("/:id", getItemById);

// PUT /api/items/:id -> update item
router.put("/:id", updateItem);

// PATCH /api/items/:id/claim -> claim an item
router.patch("/:id/claim", claimItem);

// DELETE /api/items/:id -> delete item
router.delete("/:id", deleteItem);

module.exports = router;
