"""MongoDB implementation of database interface"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from shared.models import Company, Competitor, CompanyCompetitor, Review
from shared.mongo import get_collection
from shared.collections import Collection
from shared.database.interface import DatabaseInterface


class MongoDBRepository(DatabaseInterface):
    """MongoDB implementation"""

    # Companies
    def get_company(self, company_id: str) -> Optional[Company]:
        result = get_collection(Collection.COMPANY).find_one({"_id": ObjectId(company_id)})
        if result:
            result['company_id'] = str(result.pop('_id'))
            return Company(**result)
        return None

    def create_company(self, company: Company) -> str:
        data = company.model_dump(exclude_none=True)
        result = get_collection(Collection.COMPANY).insert_one(data)
        return str(result.inserted_id)

    # Competitors
    def get_competitor(self, competitor_id: str) -> Optional[Competitor]:
        result = get_collection(Collection.COMPETITORS).find_one({"_id": ObjectId(competitor_id)})
        if result:
            result['competitor_id'] = str(result.pop('_id'))
            return Competitor(**result)
        return None

    def find_competitor_by_url(self, product_url: str) -> Optional[Competitor]:
        result = get_collection(Collection.COMPETITORS).find_one({"product_url": product_url})
        if result:
            result['competitor_id'] = str(result.pop('_id'))
            return Competitor(**result)
        return None

    def create_competitor(self, competitor: Competitor) -> str:
        data = competitor.model_dump(exclude_none=True)
        data['created_at'] = datetime.utcnow().isoformat()
        result = get_collection(Collection.COMPETITORS).insert_one(data)
        return str(result.inserted_id)

    # Company-Competitor Relationships
    def link_company_competitor(self, company_competitor: CompanyCompetitor) -> None:
        data = company_competitor.model_dump()
        data['added_at'] = datetime.utcnow().isoformat()
        get_collection(Collection.COMPANY_COMPETITORS).insert_one(data)

    def get_competitors_for_company(self, company_id: str) -> List[Dict[str, Any]]:
        pipeline = [
            {"$match": {"company_id": company_id}},
            {"$lookup": {
                "from": "competitors",
                "let": {"comp_id": {"$toObjectId": "$competitor_id"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$comp_id"]}}}],
                "as": "competitor_info"
            }},
            {"$unwind": "$competitor_info"},
            {"$replaceRoot": {
                "newRoot": {
                    "$mergeObjects": [
                        "$competitor_info",
                        {
                            "competitor_id": {"$toString": "$competitor_info._id"},
                            "category": "$category",
                            "added_at": "$added_at"
                        }
                    ]
                }
            }},
            {"$project": {"_id": 0}}
        ]
        return list(get_collection(Collection.COMPANY_COMPETITORS).aggregate(pipeline))

    def get_companies_for_competitor(self, competitor_id: str) -> List[Dict[str, Any]]:
        pipeline = [
            {"$match": {"competitor_id": competitor_id}},
            {"$lookup": {
                "from": "companies",
                "let": {"comp_id": {"$toObjectId": "$company_id"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$comp_id"]}}}],
                "as": "company_info"
            }},
            {"$unwind": "$company_info"},
            {"$replaceRoot": {
                "newRoot": {
                    "$mergeObjects": [
                        "$company_info",
                        {
                            "company_id": {"$toString": "$company_info._id"},
                            "category": "$category"
                        }
                    ]
                }
            }},
            {"$project": {"_id": 0}}
        ]
        return list(get_collection(Collection.COMPANY_COMPETITORS).aggregate(pipeline))

    # Reviews
    def create_review(self, review: Review) -> str:
        data = review.model_dump(exclude_none=True)
        data['created_at'] = datetime.utcnow().isoformat()
        result = get_collection(Collection.REVIEWS).insert_one(data)
        return str(result.inserted_id)

    def create_reviews_batch(self, reviews: List[Review]) -> int:
        docs = []
        for review in reviews:
            data = review.model_dump(exclude_none=True)
            data['created_at'] = datetime.utcnow().isoformat()
            docs.append(data)

        if docs:
            result = get_collection(Collection.REVIEWS).insert_many(docs)
            return len(result.inserted_ids)
        return 0

    def get_reviews_for_competitor(self, competitor_id: str) -> List[Review]:
        results = get_collection(Collection.REVIEWS).find({"competitor_id": competitor_id})
        reviews = []
        for result in results:
            result.pop('_id', None)
            reviews.append(Review(**result))
        return reviews

    def get_reviews_for_company(self, company_id: str) -> List[Review]:
        results = get_collection(Collection.REVIEWS).find({"company_id": company_id})
        reviews = []
        for result in results:
            result.pop('_id', None)
            reviews.append(Review(**result))
        return reviews

    def get_reviews_by_task_id(self, task_id: str) -> List[Review]:
        results = get_collection(Collection.REVIEWS).find({"task_id": task_id})
        reviews = []
        for result in results:
            result.pop('_id', None)
            reviews.append(Review(**result))
        return reviews
