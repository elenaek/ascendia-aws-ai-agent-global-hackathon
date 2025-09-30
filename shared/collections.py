from enum import Enum

class Collection(Enum):
    COMPANY = "companies"
    COMPETITORS = "competitors"
    COMPANY_COMPETITORS = "company_competitors"  # Junction collection
    REVIEWS = "reviews"
    WEBHOOKS = "webhooks"