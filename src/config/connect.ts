import mongoose from "mongoose";

const connect = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.LOCAL_DATABASE_URL as string);
    console.log("Connected to local MongoDB database successfully.");
  } catch (error) {
    console.error("Error connecting to local MongoDB database:", error);
  }
};

export default connect;
