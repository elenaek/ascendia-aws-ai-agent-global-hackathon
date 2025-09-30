"""Database interface - abstract base for MongoDB and DynamoDB"""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from shared.models import Company, Competitor, CompanyCompetitor, Review


class DatabaseInterface(ABC):
    """Abstract interface for database operations"""

    # Companies
    @abstractmethod
    def get_company(self, company_id: str) -> Optional[Company]:
        """Get company by ID"""
        pass

    @abstractmethod
    def create_company(self, company: Company) -> str:
        """Create company, return ID"""
        pass

    # Competitors
    @abstractmethod
    def get_competitor(self, competitor_id: str) -> Optional[Competitor]:
        """Get competitor by ID"""
        pass

    @abstractmethod
    def find_competitor_by_url(self, product_url: str) -> Optional[Competitor]:
        """Find competitor by product URL"""
        pass

    @abstractmethod
    def create_competitor(self, competitor: Competitor) -> str:
        """Create competitor, return ID"""
        pass

    # Company-Competitor Relationships
    @abstractmethod
    def link_company_competitor(self, company_competitor: CompanyCompetitor) -> None:
        """Link company to competitor"""
        pass

    @abstractmethod
    def get_competitors_for_company(self, company_id: str) -> List[Dict[str, Any]]:
        """Get all competitors for a company with relationship metadata"""
        pass

    @abstractmethod
    def get_companies_for_competitor(self, competitor_id: str) -> List[Dict[str, Any]]:
        """Get all companies that compete with this competitor"""
        pass

    # Reviews
    @abstractmethod
    def create_review(self, review: Review) -> str:
        """Create review, return ID"""
        pass

    @abstractmethod
    def create_reviews_batch(self, reviews: List[Review]) -> int:
        """Create multiple reviews, return count"""
        pass

    @abstractmethod
    def get_reviews_for_competitor(self, competitor_id: str) -> List[Review]:
        """Get all reviews for a competitor"""
        pass

    @abstractmethod
    def get_reviews_for_company(self, company_id: str) -> List[Review]:
        """Get all reviews for all competitors of a company"""
        pass

    @abstractmethod
    def get_reviews_by_task_id(self, task_id: str) -> List[Review]:
        """Get all reviews for a DataForSEO task"""
        pass
