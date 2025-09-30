"""Database factory - creates the appropriate database instance"""
import os
from shared.database.interface import DatabaseInterface
from shared.database.mongodb_repo import MongoDBRepository
from shared.database.dynamodb_repo import DynamoDBRepository


def get_database() -> DatabaseInterface:
    """
    Get database instance based on DATABASE_TYPE environment variable

    Returns:
        DatabaseInterface: MongoDB or DynamoDB repository

    Usage:
        db = get_database()
        company = db.get_company("123")
        db.create_review(review)
    """
    db_type = os.environ.get('DATABASE_TYPE', 'MONGODB').upper()

    if db_type == 'DYNAMODB':
        return DynamoDBRepository()
    elif db_type == 'MONGODB':
        return MongoDBRepository()
    else:
        raise ValueError(f"Unknown DATABASE_TYPE: {db_type}. Use MONGODB or DYNAMODB")
