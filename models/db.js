"use strict";
const mongoose = require("mongoose");

let AttachmentSchema = new mongoose.Schema({
  senderId : Number,
  attachmentType: String,
  attachmentLink: String
},{
  collection: 'chatbot-node'
});

module.exports = mongoose.model('Attachment', AttachmentSchema);
