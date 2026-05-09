const mongoose = require("mongoose");

const loginSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false, // improves security + performance
    },

    role: {
      type: String,
      enum: ["user", "supervisor"],
      default: "user",
      index: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // auto createdAt & updatedAt
    versionKey: false, // removes __v
  }
);

// Faster email queries
loginSchema.index({ email: 1 });

module.exports = mongoose.model("Login", loginSchema);
