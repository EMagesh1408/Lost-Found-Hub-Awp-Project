const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Electronics",
        "Books & Stationery",
        "ID Cards & Documents",
        "Clothing & Accessories",
        "Bags & Backpacks",
        "Keys",
        "Sports Equipment",
        "Other",
      ],
    },
    // Whether the item was LOST by someone, FOUND by someone, or already CLAIMED back
    status: {
      type: String,
      required: true,
      enum: ["Lost", "Found", "Claimed"],
      default: "Lost",
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
      maxlength: [150, "Location cannot exceed 150 characters"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    reporterName: {
      type: String,
      required: [true, "Reporter name is required"],
      trim: true,
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    reporterEmail: {
      type: String,
      required: [true, "Reporter email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    reporterPhone: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    claimedBy: {
      name: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      claimedAt: { type: Date, default: null },
      note: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true }
);

// Text index to support fast keyword search across the key fields
ItemSchema.index({
  title: "text",
  description: "text",
  location: "text",
  category: "text",
});

module.exports = mongoose.model("Item", ItemSchema);
