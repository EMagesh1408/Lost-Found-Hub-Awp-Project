const express = require("express");
const router = express.Router();
const { chatWithMageshAI } = require("../controllers/chatController");

// POST /api/chat -> talk to Magesh AI
router.post("/", chatWithMageshAI);

module.exports = router;
