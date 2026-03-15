// BE/scripts/seed-free-users.js
import "dotenv/config.js";
import mongoose from "mongoose";
import User from "../src/models/User.js";

async function main() {
  const mongoUri =
    process.env.MONGODB_URI ||
    "mongodb+srv://minhto1511:Minh2004@clutch.ox9s5q9.mongodb.net/eofficeai?appName=clutch";

  console.log("Connecting to Mongo:", mongoUri);
  await mongoose.connect(mongoUri);

  const users = [];
  for (let i = 1; i <= 60; i++) {
    users.push({
      email: `free_clone_${i}@example.com`,
      password: "FreeUser123!",
      name: `Free Clone ${i}`,
    });
  }

  const result = await User.insertMany(users);
  console.log(`Inserted ${result.length} free users`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});