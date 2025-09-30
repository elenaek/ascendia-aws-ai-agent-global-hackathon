import requests
import os
from time import sleep
from bson import ObjectId
from shared.mongo import get_collection
from shared.collections import Collection

DATA_FOR_SEO_URL_START_TASK = "https://api.dataforseo.com/v3/business_data/trustpilot/reviews/task_post"
DATA_FOR_SEO_URL_GET_TASK = "https://api.dataforseo.com/v3/business_data/trustpilot/reviews/task_get/{task_id}"

# def put_task(task_id: str):
#     collection = get_collection(Collection.WEBHOOKS).insert_one({
#         "task_id": task_id,
#         "url": f"https://dataforseo.com/v3/business_data/trustpilot/reviews/task_get/{task_id}"
#     })
#     return 

def get_company_reviews(company_url: str, number_of_reviews: int = 20):
    url = DATA_FOR_SEO_URL_START_TASK
    headers = {
        "Authorization": f"Basic {os.getenv('DATA_FOR_SEO_CREDS_B64')}"
    }
    data = {
        "domain": company_url,
        "depth": number_of_reviews
    }
    response = requests.post(url, headers=headers, json=data)
    if response.status_code != 200:
        raise Exception(f"Failed to start company reviews task: {response.text}")
    body = response.json()
    print(body)

    task_id = body["tasks"][0]["id"]
    sleep(20)

    url = DATA_FOR_SEO_URL_GET_TASK.format(task_id=task_id)
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to get company reviews task: {response.text}")
    body = response.json()
    print(body)
    return body["tasks"][0]["result"]



