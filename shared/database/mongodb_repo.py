"""MongoDB implementation of database interface - DEPRECATED, use DynamoDB"""
from typing import List, Optional, Dict, Any
from shared.models import Company, Competitor, CompanyCompetitor, Review
from shared.database.interface import DatabaseInterface


class MongoDBRepository(DatabaseInterface):
    """
    DEPRECATED: MongoDB implementation has been removed.
    Use DynamoDB by setting DATABASE_TYPE=DYNAMODB
    """

    def __init__(self):
        raise NotImplementedError(
            "MongoDB support has been removed. Use DynamoDB by setting DATABASE_TYPE=DYNAMODB"
        )

    def get_company(self, company_id: str) -> Optional[Company]:
        raise NotImplementedError("Use DynamoDB")

    def create_company(self, company: Company) -> str:
        raise NotImplementedError("Use DynamoDB")

    def get_competitor(self, competitor_id: str) -> Optional[Competitor]:
        raise NotImplementedError("Use DynamoDB")

    def find_competitor_by_url(self, product_url: str) -> Optional[Competitor]:
        raise NotImplementedError("Use DynamoDB")

    def create_competitor(self, competitor: Competitor) -> str:
        raise NotImplementedError("Use DynamoDB")

    def link_company_competitor(self, company_competitor: CompanyCompetitor) -> None:
        raise NotImplementedError("Use DynamoDB")

    def get_competitors_for_company(self, company_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Use DynamoDB")

    def get_companies_for_competitor(self, competitor_id: str) -> List[Dict[str, Any]]:
        raise NotImplementedError("Use DynamoDB")

    def create_review(self, review: Review) -> str:
        raise NotImplementedError("Use DynamoDB")

    def create_reviews_batch(self, reviews: List[Review]) -> int:
        raise NotImplementedError("Use DynamoDB")

    def get_reviews_for_competitor(self, competitor_id: str) -> List[Review]:
        raise NotImplementedError("Use DynamoDB")

    def get_reviews_for_company(self, company_id: str) -> List[Review]:
        raise NotImplementedError("Use DynamoDB")

    def get_reviews_by_task_id(self, task_id: str) -> List[Review]:
        raise NotImplementedError("Use DynamoDB")
