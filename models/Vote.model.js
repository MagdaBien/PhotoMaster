const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
  user: { type: String, required: true },
  votes: { type: Array, required: true },
});

module.exports = mongoose.model("Vote", voteSchema);
