import { Db, MongoClient } from 'mongodb';


let uri = process.env.DATABASE_URL as string;
let client: MongoClient | undefined;
let mongodb: Db | undefined;

async function initDB() {
  if (!client) {
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 1000 * 60 * 15 // 15mins
    } as any);
  }

  if (!mongodb || !(client as any).topology?.isConnected()) {
    try {
      await client.connect();

      // Extract database name from the connection string URI
      let dbName: string | undefined;

      try {
        const url = new URL(uri);
        // Get database name from pathname (remove leading slash)
        const pathDbName = url.pathname.substring(1);
        if (pathDbName && pathDbName !== '') {
          dbName = pathDbName;
        }
      } catch (urlError) {
        // If URL parsing fails, fall back to manual extraction for mongodb:// format
        const match = uri.match(/\/([^/?]+)(?:\?|$)/);
        if (match && match[1]) {
          dbName = match[1];
        }
      }

      // Use database name from connection string, environment variable, or default
      const finalDbName = dbName || process.env.mongodb_db_name || 'arai-dev';

      mongodb = client.db(finalDbName);
    } catch (err) {
      console.error('Error connecting to MongoDB:', err);
      throw err;
    }
  }
}

function closeDB() {
  if (client) {
    client.close();
  }
}

export { initDB, closeDB, mongodb };

// Function to update user's remaining minutes
export const updateUserRemainingMinutes = async (uid: string, deduction: number = 1) => {
  try {
    if (!mongodb) {
      await initDB();
    }

    const usersCollection = mongodb?.collection('users');
    if (!usersCollection) {
      console.log('Users collection not found');
      return false;
    }

    // Get current user data
    const user = await usersCollection.findOne({ uid });
    if (!user) {
      console.log(`User with uid ${uid} not found`);
      return false;
    }

    const currentRemainingMinutes = user.remainingMinutes || 0;
    const newRemainingMinutes = Math.max(0, currentRemainingMinutes - deduction);

    // Update the user's remaining minutes
    const result = await usersCollection.updateOne(
      { uid },
      {
        $set: {
          remainingMinutes: newRemainingMinutes,
          lastUpdated: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Updated user ${uid} remaining minutes: ${currentRemainingMinutes} -> ${newRemainingMinutes}`);
      return true;
    } else {
      console.log(`No changes made to user ${uid}`);
      return false;
    }
  } catch (error) {
    console.error('Error updating user remaining minutes:', error);
    return false;
  }
};