import boto3

from shared.mongo import get_collection
from shared.collections import Collection
from bson import ObjectId

def get_competitors(company_id: str):
    company = get_collection(Collection.COMPANY).find_one({"_id": ObjectId(company_id)})
    return company["competitors"]

# def get_review(company_url: str):
