from aws_cdk import (
    Duration,
    Stack,
    CfnOutput,
    aws_lambda as _lambda,
    aws_logs as logs,
    aws_ssm as ssm,
    aws_s3 as s3,
    aws_dynamodb as dynamodb,
    aws_cognito as cognito,
    aws_iam as iam,
    aws_secretsmanager as secretsmanager,
    aws_apigatewayv2 as apigwv2,
    RemovalPolicy,
    BundlingOptions,
)
from aws_cdk import aws_cognito_identitypool_alpha as identity_pool
from aws_cdk.aws_lambda_python_alpha import PythonFunction, BundlingOptions as PythonBundlingOptions
from constructs import Construct
from dotenv import load_dotenv
load_dotenv()
import os
import shutil
from pathlib import Path

class InfrastructureStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ============ Cognito User Pool ============

        # Create User Pool
        user_pool = cognito.UserPool(
            self, "AscendiaUserPool",
            user_pool_name=f"ascendia-users-{self.account}",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(
                email=True,
                preferred_username=False,
            ),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(
                    required=True,
                    mutable=True,
                )
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=False,
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # Create User Pool Client
        user_pool_client = user_pool.add_client(
            "AscendiaWebClient",
            user_pool_client_name=f"ascendia-web-client-{self.account}",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    implicit_code_grant=True,
                ),
                scopes=[
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PROFILE,
                ],
            ),
            prevent_user_existence_errors=True,
        )

        # ============ Cognito Identity Pool ============

        # We'll create the Identity Pool after the tables and roles

        # Get DataForSEO API credentials from environment variable
        dataforseo_auth = os.environ.get('DATA_FOR_SEO_CREDS_B64', '')

        if not dataforseo_auth:
            print("WARNING: DATA_FOR_SEO_CREDS_B64 not found in environment variables")

        # Create SSM Parameter for DataForSEO B64 auth string
        dataforseo_auth_param = ssm.StringParameter(
            self, "DataForSEOAuth",
            description="DataForSEO API B64 Basic Auth String",
            parameter_name=f"/ascendia/webhook/dataforseo/auth-{self.account}",
            string_value=dataforseo_auth,
            tier=ssm.ParameterTier.STANDARD,
        )

        # ============ Secrets Manager for AgentCore API Tokens ============

        # Get Tavily API key from environment variable
        tavily_api_key = os.environ.get('TAVILY_API_KEY', '')

        if not tavily_api_key:
            print("WARNING: TAVILY_API_KEY not found in environment variables")

        # Create SSM Parameter for Tavily API key
        agentcore_tavily_api_secret = ssm.StringParameter(
            self, "AgentCoreTavilyApiKey",
            parameter_name=f"/ascendia/agentcore/tavily-api-key-{self.account}",
            description="Tavily API key for AgentCore agent",
            string_value=tavily_api_key,
            tier=ssm.ParameterTier.STANDARD
        )


        # Create S3 bucket for raw reviews with account ID for uniqueness
        raw_reviews_bucket = s3.Bucket(
            self, "RawReviewsBucket",
            bucket_name=f"aws-hackathon-raw-reviews-{self.account}",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=RemovalPolicy.DESTROY,  # Keep data on stack deletion
            auto_delete_objects=False,
        )

        # DynamoDB Tables (parallel to MongoDB)

        # Table 1: Companies
        companies_table = dynamodb.Table(
            self, "CompaniesTable",
            table_name=f"companies-{self.account}",
            partition_key=dynamodb.Attribute(
                name="company_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
        )

        # Table 2: Competitors
        competitors_table = dynamodb.Table(
            self, "CompetitorsTable",
            table_name=f"competitors-{self.account}",
            partition_key=dynamodb.Attribute(
                name="competitor_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
        )

        # GSI for product_url lookup
        competitors_table.add_global_secondary_index(
            index_name="product-url-index",
            partition_key=dynamodb.Attribute(
                name="product_url",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # Table 3: Company-Competitors Junction
        company_competitors_table = dynamodb.Table(
            self, "CompanyCompetitorsTable",
            table_name=f"company-competitors-{self.account}",
            partition_key=dynamodb.Attribute(
                name="company_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="competitor_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # GSI to query from competitor side
        company_competitors_table.add_global_secondary_index(
            index_name="competitor-company-index",
            partition_key=dynamodb.Attribute(
                name="competitor_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="company_id",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # Table 4: Reviews
        reviews_table = dynamodb.Table(
            self, "ReviewsTable",
            table_name=f"reviews-{self.account}",
            partition_key=dynamodb.Attribute(
                name="competitor_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="review_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
        )

        # GSI1: Query reviews by company_id
        reviews_table.add_global_secondary_index(
            index_name="company-reviews-index",
            partition_key=dynamodb.Attribute(
                name="company_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="review_date",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # GSI2: Query by task_id
        reviews_table.add_global_secondary_index(
            index_name="task-reviews-index",
            partition_key=dynamodb.Attribute(
                name="task_id",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # Table 5: WebSocket Connections
        websocket_connections_table = dynamodb.Table(
            self, "WebSocketConnectionsTable",
            table_name=f"websocket-connections-{self.account}",
            partition_key=dynamodb.Attribute(
                name="connection_id",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            time_to_live_attribute="ttl",
        )

        # GSI: Query by identity_id to find active connections
        websocket_connections_table.add_global_secondary_index(
            index_name="identity-index",
            partition_key=dynamodb.Attribute(
                name="identity_id",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )

        # Create Identity Pool first (it will create its own default roles)
        identity_pool_instance = identity_pool.IdentityPool(
            self, "AscendiaIdentityPool",
            identity_pool_name=f"ascendia-identity-pool-{self.account}",
            allow_unauthenticated_identities=False,
            authentication_providers=identity_pool.IdentityPoolAuthenticationProviders(
                user_pools=[identity_pool.UserPoolAuthenticationProvider(
                    user_pool=user_pool,
                    user_pool_client=user_pool_client
                )]
            ),
        )

        # ============ IAM Policies for Row-Level Security ============

        # Get the authenticated role created by the Identity Pool
        authenticated_role = identity_pool_instance.authenticated_role

        # Add policy for row-level access to DynamoDB companies table
        authenticated_role.add_to_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
            ],
            resources=[companies_table.table_arn],
            conditions={
                "ForAllValues:StringEquals": {
                    "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
                }
            }
        ))

        # Add policy for reading competitors (they can view all competitors)
        authenticated_role.add_to_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
            ],
            resources=[
                competitors_table.table_arn,
                f"{competitors_table.table_arn}/index/*"
            ]
        ))

        # Add policy for company-competitors junction table (row-level)
        authenticated_role.add_to_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
            ],
            resources=[
                company_competitors_table.table_arn,
                f"{company_competitors_table.table_arn}/index/*"
            ],
            conditions={
                "ForAllValues:StringEquals": {
                    "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
                }
            }
        ))

        # Add policy for reviews table (row-level based on company_id)
        authenticated_role.add_to_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
            ],
            resources=[
                reviews_table.table_arn,
                f"{reviews_table.table_arn}/index/company-reviews-index"
            ],
            conditions={
                "ForAllValues:StringEquals": {
                    "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
                }
            }
        ))

        # Add policy for WebSocket API connections (for frontend to connect)
        authenticated_role.add_to_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "execute-api:Invoke",
                "execute-api:ManageConnections",
            ],
            resources=[
                f"arn:aws:execute-api:{self.region}:{self.account}:{websocket_api.ref}/*",
            ]
        ))

        # Copy shared directory to lambda during bundling
        lambda_dir = Path("lambda")
        shared_src = Path("../shared")
        shared_dest = lambda_dir / "shared"

        # Copy shared if not already there
        if shared_src.exists() and not shared_dest.exists():
            shutil.copytree(shared_src, shared_dest)

        # Create Lambda function for webhook with automatic dependency bundling
        webhook_lambda = PythonFunction(
            self, "WebhookFunction",
            runtime=_lambda.Runtime.PYTHON_3_12,
            entry="lambda",
            index="webhook.py",
            handler="handler",
            environment={
                "DATA_FOR_SEO_CREDS_B64": dataforseo_auth_param.parameter_name,
                "RAW_REVIEWS_BUCKET": raw_reviews_bucket.bucket_name,
                # DynamoDB table names
                "DYNAMODB_COMPANIES_TABLE": companies_table.table_name,
                "DYNAMODB_COMPETITORS_TABLE": competitors_table.table_name,
                "DYNAMODB_COMPANY_COMPETITORS_TABLE": company_competitors_table.table_name,
                "DYNAMODB_REVIEWS_TABLE": reviews_table.table_name,
                # Database selection - using DynamoDB
                "DATABASE_TYPE": "DYNAMODB",
                "PYTHONPATH": "/var/task:/var/task/shared",  # Add shared to Python path
            },
            timeout=Duration.seconds(30),
            memory_size=256,
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        # Grant Lambda permission to read the SSM parameter
        dataforseo_auth_param.grant_read(webhook_lambda)

        # Grant Lambda permission to put objects into the S3 bucket
        raw_reviews_bucket.grant_put(webhook_lambda)

        # Grant Lambda permissions for DynamoDB tables
        companies_table.grant_read_write_data(webhook_lambda)
        competitors_table.grant_read_write_data(webhook_lambda)
        company_competitors_table.grant_read_write_data(webhook_lambda)
        reviews_table.grant_read_write_data(webhook_lambda)

        # Add Function URL for webhook
        webhook_url = webhook_lambda.add_function_url(
            auth_type=_lambda.FunctionUrlAuthType.NONE,
            cors=_lambda.FunctionUrlCorsOptions(
                allowed_origins=["*"],
                allowed_methods=[_lambda.HttpMethod.POST, _lambda.HttpMethod.GET],
                allowed_headers=["*"],
            )
        )

        # ============ WebSocket API Gateway for Dynamic UI Updates ============

        # Lambda handler for WebSocket $connect route
        websocket_connect_lambda = PythonFunction(
            self, "WebSocketConnectHandler",
            runtime=_lambda.Runtime.PYTHON_3_12,
            entry="lambda",
            index="websocket_connect.py",
            handler="handler",
            environment={
                "CONNECTIONS_TABLE": websocket_connections_table.table_name,
            },
            timeout=Duration.seconds(10),
            memory_size=128,
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        # Lambda handler for WebSocket $disconnect route
        websocket_disconnect_lambda = PythonFunction(
            self, "WebSocketDisconnectHandler",
            runtime=_lambda.Runtime.PYTHON_3_12,
            entry="lambda",
            index="websocket_disconnect.py",
            handler="handler",
            environment={
                "CONNECTIONS_TABLE": websocket_connections_table.table_name,
            },
            timeout=Duration.seconds(10),
            memory_size=128,
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        # Grant Lambda permissions to access DynamoDB
        websocket_connections_table.grant_read_write_data(websocket_connect_lambda)
        websocket_connections_table.grant_read_write_data(websocket_disconnect_lambda)

        # Create WebSocket API
        websocket_api = apigwv2.CfnApi(
            self, "WebSocketAPI",
            name=f"ascendia-websocket-api-{self.account}",
            protocol_type="WEBSOCKET",
            route_selection_expression="$request.body.action",
        )

        # Create integrations for Lambda functions
        connect_integration = apigwv2.CfnIntegration(
            self, "ConnectIntegration",
            api_id=websocket_api.ref,
            integration_type="AWS_PROXY",
            integration_uri=f"arn:aws:apigateway:{self.region}:lambda:path/2015-03-31/functions/{websocket_connect_lambda.function_arn}/invocations",
        )

        disconnect_integration = apigwv2.CfnIntegration(
            self, "DisconnectIntegration",
            api_id=websocket_api.ref,
            integration_type="AWS_PROXY",
            integration_uri=f"arn:aws:apigateway:{self.region}:lambda:path/2015-03-31/functions/{websocket_disconnect_lambda.function_arn}/invocations",
        )

        # Create routes
        connect_route = apigwv2.CfnRoute(
            self, "ConnectRoute",
            api_id=websocket_api.ref,
            route_key="$connect",
            authorization_type="AWS_IAM",
            target=f"integrations/{connect_integration.ref}",
        )

        disconnect_route = apigwv2.CfnRoute(
            self, "DisconnectRoute",
            api_id=websocket_api.ref,
            route_key="$disconnect",
            target=f"integrations/{disconnect_integration.ref}",
        )

        # Create deployment
        websocket_deployment = apigwv2.CfnDeployment(
            self, "WebSocketDeployment",
            api_id=websocket_api.ref,
        )
        websocket_deployment.add_dependency(connect_route)
        websocket_deployment.add_dependency(disconnect_route)

        # Create stage
        websocket_stage = apigwv2.CfnStage(
            self, "WebSocketStage",
            api_id=websocket_api.ref,
            deployment_id=websocket_deployment.ref,
            stage_name="prod",
        )

        # Grant API Gateway permission to invoke Lambda functions
        websocket_connect_lambda.add_permission(
            "WebSocketConnectInvokePermission",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"arn:aws:execute-api:{self.region}:{self.account}:{websocket_api.ref}/*/*",
        )

        websocket_disconnect_lambda.add_permission(
            "WebSocketDisconnectInvokePermission",
            principal=iam.ServicePrincipal("apigateway.amazonaws.com"),
            source_arn=f"arn:aws:execute-api:{self.region}:{self.account}:{websocket_api.ref}/*/*",
        )

        # Store WebSocket API endpoint for output
        websocket_url = f"wss://{websocket_api.ref}.execute-api.{self.region}.amazonaws.com/{websocket_stage.stage_name}"

        # ============ Grant AgentCore Execution Role Access to Secret ============

        # Create IAM role for AgentCore (if not using existing role)
        # Note: AgentCore auto-creates a role, but we need to grant it permissions
        # The role ARN is typically: arn:aws:iam::ACCOUNT:role/AmazonBedrockAgentCoreSDKRuntime-REGION-HASH

        # Since we can't directly modify the auto-created role in CDK, we'll output
        # the secret ARN and manually add permissions or use a custom resource

        # Alternative: Create a policy that can be attached to the AgentCore execution role
        agentcore_secrets_policy = iam.ManagedPolicy(
            self, "AgentCoreSecretsAccessPolicy",
            managed_policy_name=f"AgentCoreSecretsAccess-{self.stack_name}",
            description="Allows AgentCore to access API tokens in SSM Parameter Store",
            statements=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=[
                        "ssm:GetParameter",
                        "ssm:GetParameters",
                        "ssm:DescribeParameters"
                    ],
                    resources=[f"arn:aws:ssm:{self.region}:{self.account}:parameter{agentcore_tavily_api_secret.parameter_name}"]
                ),
                # Grant KMS decrypt for SecureString parameters
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["kms:Decrypt"],
                    resources=["*"],  # Or specify the KMS key ARN if using custom key
                    conditions={
                        "StringEquals": {
                            "kms:ViaService": f"ssm.{self.region}.amazonaws.com"
                        }
                    }
                )
            ]
        )

        # ============ Outputs ============

        # Output Cognito details
        CfnOutput(
            self, "UserPoolId",
            value=user_pool.user_pool_id,
            description="Cognito User Pool ID",
            export_name=f"{self.stack_name}-UserPoolId"
        )

        CfnOutput(
            self, "UserPoolClientId",
            value=user_pool_client.user_pool_client_id,
            description="Cognito User Pool Client ID",
            export_name=f"{self.stack_name}-UserPoolClientId"
        )

        CfnOutput(
            self, "IdentityPoolId",
            value=identity_pool_instance.identity_pool_id,
            description="Cognito Identity Pool ID",
            export_name=f"{self.stack_name}-IdentityPoolId"
        )

        CfnOutput(
            self, "WebhookUrl",
            value=webhook_url.url,
            description="Webhook Lambda Function URL"
        )

        CfnOutput(
            self, "AgentCoreTavilySecretArn",
            value=agentcore_tavily_api_secret.parameter_name,
            description="ARN of the Secrets Manager secret for AgentCore API tokens",
            export_name=f"{self.stack_name}-AgentCoreTavilySecretArn"
        )

        CfnOutput(
            self, "AgentCoreSecretsPolicyArn",
            value=agentcore_secrets_policy.managed_policy_arn,
            description="ARN of the IAM policy to attach to AgentCore execution role",
            export_name=f"{self.stack_name}-AgentCoreSecretsPolicyArn"
        )

        CfnOutput(
            self, "WebSocketApiUrl",
            value=websocket_url,
            description="WebSocket API Gateway URL for dynamic UI updates",
            export_name=f"{self.stack_name}-WebSocketApiUrl"
        )

        CfnOutput(
            self, "WebSocketApiId",
            value=websocket_api.ref,
            description="WebSocket API Gateway ID",
            export_name=f"{self.stack_name}-WebSocketApiId"
        )

        CfnOutput(
            self, "WebSocketConnectionsTable",
            value=websocket_connections_table.table_name,
            description="DynamoDB table for WebSocket connections",
            export_name=f"{self.stack_name}-WebSocketConnectionsTable"
        )

        # Store for programmatic access
        self.user_pool_id = user_pool.user_pool_id
        self.user_pool_client_id = user_pool_client.user_pool_client_id
        self.api_url = webhook_url.url
        self.secret_arn = dataforseo_auth_param.parameter_name
        self.websocket_url = websocket_url
        self.websocket_api_id = websocket_api.ref
        self.websocket_connections_table_name = websocket_connections_table.table_name
