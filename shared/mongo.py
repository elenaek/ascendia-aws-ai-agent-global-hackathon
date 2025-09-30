
import os
from shared.collections import Collection

from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# Create a new client and connect to the server
db_client = MongoClient(os.getenv("MONGO_CONNECTION_STRING"), server_api=ServerApi('1'))

# Send a ping to confirm a successful connection
try:
    db_client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

def get_db():
    return db_client[os.getenv("MONGO_DB_NAME")]

def get_collection(collection: Collection):
    return get_db()[collection.value]