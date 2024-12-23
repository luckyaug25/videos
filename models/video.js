const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true }
});

module.exports = mongoose.model('Video', videoSchema);
