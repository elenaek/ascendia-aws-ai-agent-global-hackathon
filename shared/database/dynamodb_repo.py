"""DynamoDB implementation of database interface"""
import os
import boto3
from typing import List, Optional, Dict, Any
from datetime import datetime
from shared.models import Company, Competitor, CompanyCompetitor
from shared.dynamodb_utils import to_dynamodb_simple, from_dynamodb_simple
from shared.database.interface import DatabaseInterface


class DynamoDBRepository(DatabaseInterface):
    """DynamoDB implementation"""

    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.companies_table = self.dynamodb.Table(os.environ['DYNAMODB_COMPANIES_TABLE'])
        self.competitors_table = self.dynamodb.Table(os.environ['DYNAMODB_COMPETITORS_TABLE'])
        self.company_competitors_table = self.dynamodb.Table(os.environ['DYNAMODB_COMPANY_COMPETITORS_TABLE'])

    # Companies
    def get_company(self, company_id: str) -> Optional[Company]:
        response = self.companies_table.get_item(Key={'company_id': company_id})
        if 'Item' in response:
            return from_dynamodb_simple(response['Item'], Company)
        return None

    def create_company(self, company: Company) -> str:
        # Generate ID if not present
        if not hasattr(company, 'company_id'):
            import uuid
            company.company_id = str(uuid.uuid4())

        self.companies_table.put_item(Item=to_dynamodb_simple(company))
        return company.company_id

    # Competitors
    def get_competitor(self, competitor_id: str) -> Optional[Competitor]:
        response = self.competitors_table.get_item(Key={'competitor_id': competitor_id})
        if 'Item' in response:
            return from_dynamodb_simple(response['Item'], Competitor)
        return None

    def find_competitor_by_url(self, product_url: str) -> Optional[Competitor]:
        response = self.competitors_table.query(
            IndexName='product-url-index',
            KeyConditionExpression='product_url = :url',
            ExpressionAttributeValues={':url': product_url},
            Limit=1
        )
        if response['Items']:
            return from_dynamodb_simple(response['Items'][0], Competitor)
        return None

    def create_competitor(self, competitor: Competitor) -> str:
        import uuid
        if not hasattr(competitor, 'competitor_id'):
            competitor.competitor_id = str(uuid.uuid4())

        competitor.created_at = datetime.utcnow().isoformat()
        self.competitors_table.put_item(Item=to_dynamodb_simple(competitor))
        return competitor.competitor_id

    # Company-Competitor Relationships
    def link_company_competitor(self, company_competitor: CompanyCompetitor) -> None:
        company_competitor.added_at = datetime.utcnow().isoformat()
        self.company_competitors_table.put_item(Item=to_dynamodb_simple(company_competitor))

    def get_competitors_for_company(self, company_id: str) -> List[Dict[str, Any]]:
        # Query junction table
        response = self.company_competitors_table.query(
            KeyConditionExpression='company_id = :cid',
            ExpressionAttributeValues={':cid': company_id}
        )

        results = []
        for item in response['Items']:
            # Get competitor details
            competitor = self.get_competitor(item['competitor_id'])
            if competitor:
                result = competitor.model_dump()
                result['category'] = item.get('category')
                result['added_at'] = item.get('added_at')
                results.append(result)

        return results

    def get_companies_for_competitor(self, competitor_id: str) -> List[Dict[str, Any]]:
        response = self.company_competitors_table.query(
            IndexName='competitor-company-index',
            KeyConditionExpression='competitor_id = :cid',
            ExpressionAttributeValues={':cid': competitor_id}
        )

        results = []
        for item in response['Items']:
            company = self.get_company(item['company_id'])
            if company:
                result = company.model_dump()
                result['category'] = item.get('category')
                results.append(result)

        return results
