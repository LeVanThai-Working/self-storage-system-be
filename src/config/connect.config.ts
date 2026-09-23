import mongoose from 'mongoose';

const connect = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB database successfully.');
  } catch (error) {
    console.error('Error connecting to MongoDB database:', error);
  }
};

export default connect;
