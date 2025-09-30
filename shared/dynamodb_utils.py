"""Utilities for working with DynamoDB and Pydantic models"""
from typing import TypeVar, Type, Any, Dict
from pydantic import BaseModel
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer

T = TypeVar('T', bound=BaseModel)

# DynamoDB type serializer/deserializer
serializer = TypeSerializer()
deserializer = TypeDeserializer()


def to_dynamodb(model: BaseModel) -> Dict[str, Any]:
    """
    Convert Pydantic model to DynamoDB item format

    Args:
        model: Pydantic model instance

    Returns:
        DynamoDB item dictionary with type annotations
    """
    # Get model as dict, excluding None values
    data = model.model_dump(exclude_none=True)

    # Serialize to DynamoDB format
    return {k: serializer.serialize(v) for k, v in data.items()}


def from_dynamodb(item: Dict[str, Any], model_class: Type[T]) -> T:
    """
    Convert DynamoDB item to Pydantic model

    Args:
        item: DynamoDB item dictionary
        model_class: Pydantic model class to instantiate

    Returns:
        Instance of the Pydantic model
    """
    # Deserialize from DynamoDB format
    data = {k: deserializer.deserialize(v) for k, v in item.items()}

    # Create and validate with Pydantic
    return model_class(**data)


def to_dynamodb_simple(model: BaseModel) -> Dict[str, Any]:
    """
    Convert Pydantic model to simple dict for boto3 put_item
    (boto3 handles serialization automatically)

    Args:
        model: Pydantic model instance

    Returns:
        Simple dictionary (boto3 will serialize)
    """
    return model.model_dump(exclude_none=True)


def from_dynamodb_simple(item: Dict[str, Any], model_class: Type[T]) -> T:
    """
    Convert DynamoDB item (from boto3 response) to Pydantic model
    (boto3 handles deserialization automatically)

    Args:
        item: DynamoDB item from boto3 response
        model_class: Pydantic model class

    Returns:
        Instance of the Pydantic model
    """
    return model_class(**item)
