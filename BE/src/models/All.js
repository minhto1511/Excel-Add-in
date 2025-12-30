// Central export for all models
const User = require("./User");
const Transaction = require("./Transaction");
const Conversation = require("./Conversation");
const Message = require("./Message");
const AIHistory = require("./AIHistory");

module.exports = {
  User,
  Transaction,
  Conversation,
  Message,
  AIHistory,
};
