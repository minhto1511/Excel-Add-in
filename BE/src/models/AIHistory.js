const mongoose = require("mongoose");
const crypto = require("crypto");

const aiHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["formula", "analysis", "guide"],
      required: true,
      index: true,
    },

    input: {
      prompt: {
        type: String,
        required: true,
      },
      excelContext: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      contextHash: {
        type: String,
        index: true,
      },
    },

    output: {
      result: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      tokensUsed: Number,
      latency: Number, // ms
    },

    isCached: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
aiHistorySchema.index({ userId: 1, type: 1, createdAt: -1 });

// TTL index: auto-delete records older than 90 days
aiHistorySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// Pre-save hook: Generate contextHash
aiHistorySchema.pre("save", function (next) {
  if (this.input.prompt && !this.input.contextHash) {
    const hashInput = JSON.stringify({
      prompt: this.input.prompt,
      type: this.type,
      context: this.input.excelContext,
    });
    this.input.contextHash = crypto
      .createHash("md5")
      .update(hashInput)
      .digest("hex");
  }
  next();
});

// Static method: Find cached result
aiHistorySchema.statics.findCached = async function (
  type,
  prompt,
  excelContext
) {
  const hashInput = JSON.stringify({ prompt, type, context: excelContext });
  const hash = crypto.createHash("md5").update(hashInput).digest("hex");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return await this.findOne({
    "input.contextHash": hash,
    type,
    createdAt: { $gte: oneDayAgo },
  });
};

module.exports = mongoose.model("AIHistory", aiHistorySchema);
