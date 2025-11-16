import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`MongoDB connected to database: ${process.env.DB_NAME}`);
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1); // thoát app nếu không kết nối được
    }
};

export default connectDB;
