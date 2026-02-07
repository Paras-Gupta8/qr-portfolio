const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  bio: String,
  links: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Portfolio", portfolioSchema);
