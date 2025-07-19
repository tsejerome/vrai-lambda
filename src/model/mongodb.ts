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
      console.log(`Connected to MongoDB database: ${finalDbName}`);
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