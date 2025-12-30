const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    supportAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["open", "waiting", "resolved", "closed"],
      default: "open",
      index: true,
    },

    subject: {
      type: String,
      default: "Support Request",
    },

    lastMessage: String,

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    unreadCountUser: {
      type: Number,
      default: 0,
    },

    unreadCountAgent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for various queries
conversationSchema.index({ userId: 1, status: 1 });
conversationSchema.index({ supportAgentId: 1, status: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
