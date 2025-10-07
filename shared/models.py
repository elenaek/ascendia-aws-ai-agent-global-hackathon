"""Shared data models for backend and Lambda functions"""
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId

class Product(BaseModel):
    product_name: str = Field(description="The name of the product")
    product_url: str = Field(description="The URL of the product")
    product_description: str = Field(description="The description of the product")

class Company(BaseModel):
    """Company data model"""
    company_name: str = Field(description="The name of the company")
    company_url: str = Field(description="The URL of the company")
    company_description: str = Field(description="The description of the company")
    unique_value_proposition: str = Field(description="The unique value proposition of the company")
    stage_of_company: str = Field(description="The stage of the company")
    types_of_products: list[Product] = Field(description="The types of products the company offers")
    revenue: Optional[float] = Field(default=None, description="The revenue of the company")
    number_of_employees: Optional[int] = Field(default=None, description="The number of employees of the company")
    who_are_our_customers: Optional[str] = Field(default=None, description="The who are our customers of the company")

class Competitor(BaseModel):
    """Competitor data model - represents a unique competitor company/product"""
    competitor_name: str = Field(description="The company name of the competitor")
    product_name: str = Field(description="The name of the competitor's product")
    product_url: str = Field(description="The URL of the competitor's product")
    product_description: str = Field(description="The description of the competitor's product")
    created_at: Optional[str] = Field(default=None, description="Timestamp when created")

    class Config:
        json_encoders = {
            ObjectId: str
        }

class CompanyCompetitor(BaseModel):
    """Junction model - links companies to competitors with relationship metadata"""
    company_id: str = Field(description="ObjectId of the company")
    competitor_id: str = Field(description="ObjectId of the competitor")
    category: Literal["Direct Competitors", "Indirect Competitors", "Potential Competitors"] = Field(
        description="The category of the competitor for this specific company"
    )
    added_at: Optional[str] = Field(default=None, description="When this relationship was created")

    class Config:
        json_encoders = {
            ObjectId: str
        }

class Review(BaseModel):
    """Review data model"""
    competitor_id: str = Field(description="ObjectId of the competitor this review belongs to")
    company_id: str = Field(description="ObjectId of the company (denormalized for faster queries)")
    task_id: str = Field(description="DataForSEO task ID")
    rank: int = Field(description="Rank of the review")
    reviewer_review_count: int = Field(description="Number of reviews by this reviewer")
    reviewer_name: str = Field(description="Name of the reviewer")
    review_text: str = Field(description="Text content of the review")
    rating: float = Field(description="Rating given (e.g., 1-5 stars)")
    review_date: str = Field(description="Date of the review")
    created_at: Optional[str] = Field(default=None, description="Timestamp when stored")

    class Config:
        json_encoders = {
            ObjectId: str
        }

class ReviewBatch(BaseModel):
    """Batch of reviews from DataForSEO"""
    competitor_id: str = Field(description="Competitor ID from database")
    company_id: str = Field(description="Company ID from database")
    task_id: str = Field(description="DataForSEO task ID")
    reviews: list[Review] = Field(description="List of reviews")
