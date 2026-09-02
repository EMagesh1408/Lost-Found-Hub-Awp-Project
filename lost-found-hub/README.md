# Lost & Found Hub 🎓

A centralized, full-stack web platform that helps college students report, search, and recover lost belongings — instead of relying on scattered WhatsApp groups and paper flyers.

Built with **HTML / CSS / JavaScript** on the frontend, **Node.js + Express** on the backend, **MongoDB + Mongoose** for storage, and a floating AI assistant ("**Magesh AI**") powered by the **OpenRouter API**.

---

## ✨ Features

- **Live item board** — every lost/found item is stored in MongoDB and rendered dynamically (nothing is hard-coded)
- **Search** — debounced keyword search across title, description, and location
- **Filters** — by status (Lost / Found / Claimed) and category (Electronics, Books, IDs, etc.)
- **Item details modal** — full info popup for each listing
- **Report Lost/Found form** — client + server-side validation, date picker, optional photo **upload** (drag & drop or click, with live preview and progress bar)
- **Claim flow** — claim a found item (or confirm a lost one is recovered); status updates instantly
- **Toast notifications**, **loading skeletons**, and **empty states** throughout
- **Fully responsive** — mobile navbar, stacked forms, adaptive grid
- **Magesh AI** — floating chatbot (bottom-right) that explains how to use the site, and can answer questions about currently listed items using live database context. The OpenRouter API key is **never** exposed to the browser — all AI calls go through the backend.

---

## 🗂️ Project structure

```
lost-found-hub/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── itemController.js     # CRUD + search/filter + claim logic
│   │   └── chatController.js     # Magesh AI ↔ OpenRouter integration
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── models/
│   │   └── Item.js               # Mongoose schema
│   ├── routes/
│   │   ├── itemRoutes.js
│   │   ├── chatRoutes.js
│   │   └── uploadRoutes.js
│   ├── uploads/                  # Uploaded item photos (served at /uploads/*)
│   ├── seed.js                   # Optional: populate sample data
│   ├── server.js                 # App entry point (serves API + frontend)
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js                # fetch() wrapper for the REST API
│   │   ├── app.js                # UI logic: rendering, filters, forms, modals
│   │   └── chatbot.js            # Magesh AI widget logic
│   └── index.html
├── .gitignore
└── README.md
```

The Express server serves the `frontend/` folder as static files **and** exposes the `/api/*` REST endpoints — so in production you only need to run one process.

---

## 🔌 REST API

All endpoints are prefixed with `/api`.

| Method | Endpoint                    | Description                                  |
|--------|------------------------------|-----------------------------------------------|
| GET    | `/items`                    | List items — supports `?search=&category=&status=&sort=&page=&limit=` |
| GET    | `/items/:id`                | Get a single item's full details             |
| POST   | `/items`                    | Report a new lost/found item                  |
| PUT    | `/items/:id`                | Update an item's fields                        |
| PATCH  | `/items/:id/claim`          | Claim an item (marks it `Claimed`)             |
| DELETE | `/items/:id`                | Delete an item                                 |
| GET    | `/items/stats/summary`      | Counts of Lost / Found / Claimed / Total       |
| POST   | `/upload`                   | Upload an item photo (multipart, field `image`) → returns `{ url }` |
| POST   | `/chat`                     | Send a message to Magesh AI                    |
| GET    | `/health`                   | Health check                                   |

Uploaded photos are saved to `backend/uploads/` and served statically at `/uploads/<filename>`. Accepted formats: JPG, PNG, WEBP, GIF — up to 5MB. The frontend uploads the file as soon as it's selected/dropped, then stores the returned URL on the item when the report form is submitted.

Example — report an item:
```bash
curl -X POST http://localhost:5000/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Black Dell Laptop",
    "description": "Dell Inspiron, small dent on the lid",
    "category": "Electronics",
    "status": "Lost",
    "location": "Central Library",
    "date": "2026-08-30",
    "reporterName": "Ananya Rao",
    "reporterEmail": "ananya@college.edu"
  }'
```

---

## 🧰 Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A MongoDB database — either:
  - **Local MongoDB** installed on your machine, or
  - A free **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)** cluster (recommended, no local install needed)
- An **[OpenRouter](https://openrouter.ai/keys)** API key (free tier available) for the Magesh AI chatbot

---

## 🚀 Installation & run commands

```bash
# 1. Clone / unzip the project, then enter the backend folder
cd lost-found-hub/backend

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# then open .env and fill in MONGO_URI and OPENROUTER_API_KEY (see below)

# 4. (Optional) seed the database with sample demo items
npm run seed

# 5. Start the server
npm run dev      # with auto-reload (nodemon)
# or
npm start        # plain node

# 6. Open the app
# → http://localhost:5000
```

The frontend is served automatically by the same Express server — there's no separate frontend build step or server to run.

---

## 🍃 MongoDB setup instructions

### Option A — MongoDB Atlas (recommended, free, no install)

1. Create a free account at [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register).
2. Create a new **free (M0) cluster**.
3. Under **Database Access**, create a database user with a username/password.
4. Under **Network Access**, add your current IP (or `0.0.0.0/0` for quick testing/demos).
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Paste it into your `.env` as `MONGO_URI`, adding a database name before the `?`:
   ```
   MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/lostfoundhub?retryWrites=true&w=majority
   ```

### Option B — Local MongoDB

1. Install MongoDB Community Edition: [mongodb.com/docs/manual/installation](https://www.mongodb.com/docs/manual/installation/)
2. Start the MongoDB service:
   ```bash
   # macOS (Homebrew)
   brew services start mongodb-community

   # Linux (systemd)
   sudo systemctl start mongod

   # Windows
   net start MongoDB
   ```
3. Use the local connection string in `.env` (this is already the default in `.env.example`):
   ```
   MONGO_URI=mongodb://127.0.0.1:27017/lostfoundhub
   ```

No manual collection/schema setup is required — Mongoose creates the `items` collection automatically from `backend/models/Item.js` the first time an item is saved.

---

## 🤖 Setting up Magesh AI (OpenRouter)

1. Sign up at [openrouter.ai](https://openrouter.ai/) and create an API key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Add it to your `.env`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
   OPENROUTER_MODEL=openai/gpt-4o-mini
   ```
3. You can swap `OPENROUTER_MODEL` for any [model slug OpenRouter supports](https://openrouter.ai/models).
4. That's it — the chatbot icon in the bottom-right of the site will start responding. All requests to OpenRouter happen from `backend/controllers/chatController.js`, so the key is never sent to or visible in the browser.

If no key is configured, Magesh AI will politely tell users it isn't set up yet instead of crashing the app.

---

## 🔐 Security notes

- `.env` is git-ignored — never commit real credentials.
- The OpenRouter API key and MongoDB URI are read only on the server (`process.env`) and are never included in any frontend JS bundle or HTML.
- All incoming item/claim data is validated on both the client (for UX) and the server (for actual security), including required fields, email format, and status enum checks.
- CORS is restricted via `CLIENT_ORIGIN` in `.env` (defaults to `*` for local development — tighten this in production).

---

## 🖥️ Tech stack summary

| Layer      | Technology                          |
|------------|--------------------------------------|
| Frontend   | HTML5, CSS3 (custom design system), vanilla JavaScript |
| Backend    | Node.js, Express.js                  |
| Database   | MongoDB, Mongoose ODM                |
| AI Chatbot | OpenRouter API (server-side proxy)   |

---

## 📄 License

Built as an educational/demo project. Free to use and adapt for your campus.
