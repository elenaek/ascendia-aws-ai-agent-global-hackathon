from aws_cdk import (
    Duration,
    Stack,
    aws_lambda as _lambda,
    aws_logs as logs,
    aws_ssm as ssm,
)
from constructs import Construct
from dotenv import load_dotenv
load_dotenv()
import os

class InfrastructureStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Get DataForSEO API credentials from environment variable
        dataforseo_auth = os.environ.get('DATA_FOR_SEO_CREDS_B64', '')

        if not dataforseo_auth:
            print("WARNING: DATA_FOR_SEO_CREDS_B64 not found in environment variables")

        # Create SSM Parameter for DataForSEO B64 auth string
        dataforseo_auth_param = ssm.StringParameter(
            self, "DataForSEOAuth",
            description="DataForSEO API B64 Basic Auth String",
            parameter_name="/webhook/dataforseo/auth",
            string_value=dataforseo_auth,
            tier=ssm.ParameterTier.STANDARD,
        )

        # Create Lambda function for webhook
        webhook_lambda = _lambda.Function(
            self, "WebhookFunction",
            runtime=_lambda.Runtime.PYTHON_3_12,
            code=_lambda.Code.from_asset("lambda"),
            handler="webhook.handler",
            environment={
                "DATA_FOR_SEO_CREDS_B64": dataforseo_auth_param.parameter_name,
            },
            timeout=Duration.seconds(30),
            memory_size=256,
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        # Grant Lambda permission to read the SSM parameter
        dataforseo_auth_param.grant_read(webhook_lambda)

        # Add Function URL for webhook
        webhook_url = webhook_lambda.add_function_url(
            auth_type=_lambda.FunctionUrlAuthType.NONE,
            cors=_lambda.FunctionUrlCorsOptions(
                allowed_origins=["*"],
                allowed_methods=[_lambda.HttpMethod.POST],
                allowed_headers=["*"],
            )
        )

        # Output the Function URL and secret ARN
        self.api_url = webhook_url.url
        self.secret_arn = dataforseo_auth_param.parameter_name
