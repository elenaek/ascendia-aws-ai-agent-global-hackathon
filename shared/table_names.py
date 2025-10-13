"""DynamoDB table name helpers"""
import os

def get_table_name(table_type: str) -> str:
    """
    Get DynamoDB table name from environment variables

    Args:
        table_type: One of 'companies', 'competitors', 'company_competitors'

    Returns:
        Table name from environment
    """
    table_map = {
        'companies': 'DYNAMODB_COMPANIES_TABLE',
        'competitors': 'DYNAMODB_COMPETITORS_TABLE',
        'company_competitors': 'DYNAMODB_COMPANY_COMPETITORS_TABLE'
    }

    env_var = table_map.get(table_type)
    if not env_var:
        raise ValueError(f"Unknown table type: {table_type}")

    return os.environ.get(env_var, f"{table_type}-{os.environ.get('AWS_ACCOUNT_ID', 'local')}")
