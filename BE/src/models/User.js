import { Schema, model } from "mongoose";
import { genSalt, hash, compare } from "bcryptjs";

const userSchema = new Schema(
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
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await genSalt(10);
  this.password = await hash(this.password, salt);
});

// Pre-save hook: Set billing date for new free users
userSchema.pre("save", function () {
  if (this.isNew && this.subscription.plan === "free") {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.subscription.nextBillingDate = nextMonth;
  }
});

// Method: Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await compare(candidatePassword, this.password);
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

export default model("User", userSchema);
