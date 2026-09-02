/**
 * Optional helper script to seed the database with sample items,
 * useful for demos/presentations. Run with: npm run seed
 */
require("dotenv").config();
const connectDB = require("./config/db");
const Item = require("./models/Item");

const sampleItems = [
  {
    title: "Black Dell Laptop",
    description: "Dell Inspiron 15, black cover with a small dent on the lid. Has a college sticker on the back.",
    category: "Electronics",
    status: "Lost",
    location: "Central Library, 2nd Floor",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    reporterName: "Ananya Rao",
    reporterEmail: "ananya.rao@college.edu",
    reporterPhone: "9876543210",
    imageUrl: "",
  },
  {
    title: "Blue Wildcraft Backpack",
    description: "Found near the cafeteria entrance. Contains a few notebooks and a water bottle.",
    category: "Bags & Backpacks",
    status: "Found",
    location: "Main Cafeteria",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    reporterName: "Security Desk",
    reporterEmail: "security@college.edu",
    reporterPhone: "",
    imageUrl: "",
  },
  {
    title: "Student ID Card - Rahul Sharma",
    description: "Found ID card near the parking lot, CSE department.",
    category: "ID Cards & Documents",
    status: "Found",
    location: "Parking Lot B",
    date: new Date(Date.now() - 1000 * 60 * 60 * 5),
    reporterName: "Priya Menon",
    reporterEmail: "priya.menon@college.edu",
    reporterPhone: "9123456780",
    imageUrl: "",
  },
  {
    title: "Silver Bicycle Keys (2 keys on a red keychain)",
    description: "Lost somewhere between the hostel block and the academic building.",
    category: "Keys",
    status: "Lost",
    location: "Between Hostel Block C and Academic Block",
    date: new Date(Date.now() - 1000 * 60 * 60 * 30),
    reporterName: "Karthik Iyer",
    reporterEmail: "karthik.iyer@college.edu",
    reporterPhone: "",
    imageUrl: "",
  },
  {
    title: "Casio Scientific Calculator (fx-991ES)",
    description: "Found in Lecture Hall 3 after the mid-sem exam.",
    category: "Electronics",
    status: "Found",
    location: "Lecture Hall 3",
    date: new Date(Date.now() - 1000 * 60 * 60 * 12),
    reporterName: "Faculty Office",
    reporterEmail: "faculty.office@college.edu",
    reporterPhone: "",
    imageUrl: "",
  },
  {
    title: "Grey Hoodie (Size M)",
    description: "Left behind at the basketball court after evening practice.",
    category: "Clothing & Accessories",
    status: "Claimed",
    location: "Basketball Court",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    reporterName: "Arjun Patel",
    reporterEmail: "arjun.patel@college.edu",
    reporterPhone: "",
    imageUrl: "",
    claimedBy: {
      name: "Suresh Kumar",
      email: "suresh.kumar@college.edu",
      claimedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      note: "This is mine, has my initials on the tag.",
    },
  },
];

async function seed() {
  await connectDB();
  await Item.deleteMany({});
  await Item.insertMany(sampleItems);
  console.log(`✅ Seeded ${sampleItems.length} sample items.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
