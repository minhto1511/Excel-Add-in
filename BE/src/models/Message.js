import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    senderRole: {
      type: String,
      enum: ["user", "support", "admin"],
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    attachments: {
      type: [String],
      default: [],
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index for loading messages in order
messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
