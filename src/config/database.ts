import mongoose from 'mongoose';

class DatabaseConnection {
  private isConnected: boolean = false;

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('📦 Database already connected');
      return;
    }

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/projectspeckit';

      await mongoose.connect(mongoUri, {
        // Mongoose 6+ doesn't need most of the old connection options
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      });

      this.isConnected = true;
      console.log('📦 MongoDB connected successfully');
      console.log(`📍 Connected to: ${mongoUri}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📦 MongoDB disconnected');
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📦 MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<{ status: string; connected: boolean; database?: string }> {
    try {
      if (mongoose.connection.readyState === 1) {
        return {
          status: 'healthy',
          connected: true,
          database: mongoose.connection.name
        };
      } else {
        return {
          status: 'disconnected',
          connected: false
        };
      }
    } catch (error) {
      return {
        status: 'error',
        connected: false
      };
    }
  }
}

export const database = new DatabaseConnection();