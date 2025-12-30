const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    avatar: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ["user", "admin", "support"],
      default: "user",
    },

    subscription: {
      plan: {
        type: String,
        enum: ["free", "pro"],
        default: "free",
      },
      credits: {
        type: Number,
        default: 10,
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      nextBillingDate: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ "subscription.plan": 1 });

// Virtual: Check if user has credits
userSchema.virtual("hasCredits").get(function () {
  return this.subscription.plan === "pro" || this.subscription.credits > 0;
});

// Pre-save hook: Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Pre-save hook: Set billing date for new free users
userSchema.pre("save", function (next) {
  if (this.isNew && this.subscription.plan === "free") {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.subscription.nextBillingDate = nextMonth;
  }
  next();
});

// Method: Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method: Deduct credit
userSchema.methods.deductCredit = async function () {
  if (this.subscription.plan === "free") {
    if (this.subscription.credits <= 0) {
      throw new Error("Out of credits");
    }
    this.subscription.credits -= 1;
    await this.save();
  }
  // Pro users: unlimited, no deduction
};

module.exports = mongoose.model("User", userSchema);
