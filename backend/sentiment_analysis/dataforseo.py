import requests
import os
from time import sleep

DATA_FOR_SEO_URL_START_TASK = "https://api.dataforseo.com/v3/business_data/trustpilot/reviews/task_post"
DATA_FOR_SEO_URL_GET_TASK = "https://api.dataforseo.com/v3/business_data/trustpilot/reviews/task_get/{task_id}"

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



