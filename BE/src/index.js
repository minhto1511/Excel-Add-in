import dotenv from "dotenv"; //dotenv dùng để đọc file .env và nạp biến môi trường vào process.env
import connectDB from "./config/database.js";
import app from "./app.js"; //import app từ file app.js

dotenv.config({
  path: "./.env",
});

const startServer = async () => {
  try {
    console.log("MONGODB_URI:", process.env.MONGODB_URI);
    await connectDB();
    app.on("error", (error) => {
      // to check if there are any errors
      console.log("Error:", error);
      throw error;
    });

    app.listen(process.env.PORT || 6969, () => {
      // to check if the server is running on the correct port
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log("MongoDB connection failed!!:", error);
    throw error;
  }
};

startServer();
