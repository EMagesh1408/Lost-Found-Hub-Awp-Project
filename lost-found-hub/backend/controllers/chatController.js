const fetch = require("node-fetch");
const Item = require("../models/Item");

const SYSTEM_PROMPT = `You are "Magesh AI", the friendly built-in assistant for "Lost & Found Hub", a web app that helps college students report and recover lost belongings.

Your job:
1. Help users understand how to use the website (search items, filter by category/status, report a lost or found item, claim an item).
2. Help users search/understand lost & found item listings when given context data.
3. Guide users step-by-step through reporting an item or claiming one.
4. Be concise, warm, and practical. Use short paragraphs or bullet points.
5. If asked about something unrelated to the Lost & Found Hub app, gently redirect the conversation back, but you can still answer briefly and politely.

Key facts about the site:
- Students can browse "Lost" and "Found" item listings on the homepage.
- Items have a category (Electronics, Books & Stationery, ID Cards & Documents, Clothing & Accessories, Bags & Backpacks, Keys, Sports Equipment, Other), a status (Lost, Found, Claimed), a location, a date, and a description.
- To report an item, click the "Report Item" button in the navbar or hero section, fill the form (title, description, category, status, location, date, name, email, optional phone/photo URL), and submit.
- To claim a found item (or mark a lost item as recovered), open the item's details popup and click "Claim Item", then provide the claimant's name and email.
- Users can search by keyword and filter by category/status using the search bar and filter chips.
- All reported items are stored securely in the site's database and shown live to everyone browsing.

Never claim to have real-time access to the database unless item data is explicitly provided to you in the conversation context. If no item data is given and the user asks about specific items, tell them to use the search bar/filters on the page, and offer to help them phrase a good search.`;

/**
 * POST /api/chat
 * Body: { message: string, history?: [{role, content}], itemsContext?: bool }
 * Talks to OpenRouter on the server so the API key is never exposed to the browser.
 */
async function chatWithMageshAI(req, res) {
  const { message, history = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Message is required" });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({
      success: false,
      message:
        "Magesh AI is not configured yet. Ask the site admin to set OPENROUTER_API_KEY in the backend .env file.",
    });
  }

  // Give the assistant light-weight live context: a handful of recent items,
  // so it can answer things like "has anyone found a black wallet?"
  let contextBlock = "";
  try {
    const recentItems = await Item.find({})
      .sort({ createdAt: -1 })
      .limit(25)
      .select("title category status location date");

    if (recentItems.length) {
      const lines = recentItems
        .map(
          (it) =>
            `- [${it.status}] "${it.title}" (${it.category}) at ${it.location}, dated ${new Date(
              it.date
            ).toLocaleDateString()}`
        )
        .join("\n");
      contextBlock = `\n\nHere are up to 25 of the most recent item listings currently in the database (use these to answer questions about existing items; do not invent items that aren't listed here):\n${lines}`;
    }
  } catch (e) {
    // If DB lookup fails, continue without context rather than failing the whole chat
    contextBlock = "";
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT + contextBlock },
    ...history
      .filter((m) => m && m.role && m.content)
      .slice(-10) // keep the payload small
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
    { role: "user", content: message.trim().slice(0, 2000) },
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:5000",
        "X-Title": process.env.SITE_NAME || "Lost & Found Hub",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", response.status, errText);
      return res.status(502).json({
        success: false,
        message: "Magesh AI couldn't reach the AI service right now. Please try again shortly.",
      });
    }

    const data = await response.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I couldn't come up with a response. Could you rephrase that?";

    res.json({ success: true, reply });
  } catch (err) {
    console.error("Magesh AI error:", err.message);
    res.status(500).json({
      success: false,
      message: "Something went wrong talking to Magesh AI. Please try again.",
    });
  }
}

module.exports = { chatWithMageshAI };
