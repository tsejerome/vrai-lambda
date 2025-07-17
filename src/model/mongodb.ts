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
      // Use the database name from the connection string if not provided
      const dbName =
        process.env.mongodb_db_name ||
        (client.options.dbName ? client.options.dbName : undefined) ||
        'arai-dev';
      mongodb = client.db(dbName);
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