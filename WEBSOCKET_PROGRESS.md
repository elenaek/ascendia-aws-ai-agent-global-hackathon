# WebSocket Dynamic UI Implementation Progress

## Overview
Implementation of WebSocket-based dynamic UI updates allowing the AI agent to trigger real-time interface changes during conversations.

---

## ✅ Completed Phases

### Phase 1: Infrastructure (Committed: be8e1ff)
- [x] **CDK Stack Updates** - `infrastructure/infrastructure/infrastructure_stack.py`
  - Added WebSocket API Gateway with `$connect` and `$disconnect` routes
  - Created DynamoDB table `websocket-connections-{account}` with GSI on `identity_id`
  - Configured IAM authorization using Cognito Identity Pool
  - Added CloudFormation outputs for WebSocket URL and API ID

- [x] **Lambda Handlers**
  - `infrastructure/lambda/websocket_connect.py`: Store connection_id → identity_id mapping
  - `infrastructure/lambda/websocket_disconnect.py`: Clean up connections on disconnect

- [x] **IAM Permissions**
  - Granted authenticated Cognito role `execute-api:Invoke` and `execute-api:ManageConnections`
  - Lambda functions have DDB read/write access

### Phase 2: Backend Agent Integration (Committed: 30babe6)
- [x] **WebSocket Helper** - `backend/websocket_helper.py`
  - Query DDB for active connections by identity_id
  - Send messages via API Gateway Management API
  - Handle stale connection cleanup

- [x] **Agent Tool** - `backend/main.py`
  - Implemented `send_ui_update` tool with 6 message types:
    - `show_competitor_context`: Display competitor info card
    - `show_insight`: Show analysis insight card
    - `show_notification`: Toast notifications
    - `update_competitor_panel`: Refresh competitors list
    - `show_progress`: Progress indicators
    - `highlight_element`: Animate UI elements
  - Added tool to agent's available tools
  - Set identity_id from company info for routing

### Phase 3: Frontend Core (Committed: a994715)
- [x] **Type Definitions** - `web/types/websocket-messages.ts`
  - TypeScript interfaces for all message payloads
  - Type-safe message handling

- [x] **WebSocket Client** - `web/lib/websocket-client.ts`
  - AWS Signature V4 authentication with Cognito credentials
  - Auto-reconnect with exponential backoff (max 5 attempts)
  - Connection lifecycle management

- [x] **UI Store** - `web/stores/ui-store.ts`
  - Zustand store for dynamic UI state
  - Manages: activeCards, notifications, progressIndicators, highlightedElements
  - Auto-cleanup with timeouts

- [x] **React Hook** - `web/hooks/useWebSocketUI.ts`
  - Connects/disconnects based on agent response state
  - Routes messages to appropriate UI actions
  - Integrates with sonner for toast notifications

### Phase 4: UI Components (Committed: 3cdb893)
- [x] **Dynamic Cards**
  - `web/components/dashboard/dynamic-competitor-card.tsx`: Animated competitor context cards
  - `web/components/dashboard/insight-card.tsx`: Severity-based insight cards
  - `web/components/dashboard/dynamic-ui-overlay.tsx`: Container for all dynamic UI

- [x] **Dashboard Integration** - `web/app/dashboard/page.tsx`
  - useWebSocketUI hook enabled during chat loading
  - DynamicUIOverlay rendered as fixed-position overlay
  - Progress indicators in top-right, cards in bottom-right

- [x] **Environment Configuration** - `web/.env.example`
  - Added `NEXT_PUBLIC_WEBSOCKET_URL` configuration
  - Added `NEXT_PUBLIC_AGENTCORE_ARN` configuration

---

## 📋 Remaining Tasks

### Deployment
- [ ] Deploy infrastructure: `cd infrastructure && cdk deploy`
- [ ] Copy WebSocket URL from outputs to `web/.env`
- [ ] Set `WEBSOCKET_API_ID` environment variable in backend
- [ ] Redeploy backend agent with WebSocket environment variables

### Testing
- [ ] Test WebSocket connection from frontend
- [ ] Test agent tool execution with each message type
- [ ] Verify IAM authentication works correctly
- [ ] Test reconnection logic after disconnects
- [ ] Test multiple concurrent users

### Enhancements (Optional)
- [ ] Implement proper AWS SigV4 signing in WebSocket client (currently simplified)
- [ ] Add `update_competitor_panel` handler to refresh CompetitorsPanel
- [ ] Add element highlighting with actual DOM element references
- [ ] Add analytics/telemetry for WebSocket usage
- [ ] Add WebSocket connection status indicator in UI

---

## 🔗 Integration Points

### Environment Variables Needed

**Backend (`backend/.env`):**
```bash
WEBSOCKET_API_ID=<from CDK output>
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=<your-account-id>
```

**Frontend (`web/.env`):**
```bash
NEXT_PUBLIC_WEBSOCKET_URL=wss://<api-id>.execute-api.us-east-1.amazonaws.com/prod
NEXT_PUBLIC_AGENTCORE_ARN=<from bedrock_agentcore.yaml>
```

### CDK Outputs
After deployment, retrieve these outputs:
```bash
cdk deploy --outputs-file outputs.json
```

Outputs include:
- `WebSocketApiUrl`: WebSocket connection URL
- `WebSocketApiId`: API Gateway WebSocket API ID
- `WebSocketConnectionsTable`: DynamoDB table name

---

## 🚨 Known Issues

### WebSocket Client Authentication
The current WebSocket client uses a simplified SigV4 signing approach. For production, consider:
- Using `@aws-sdk/signature-v4` library for proper signing
- Or using a Lambda authorizer with JWT tokens instead of IAM

### Message Type: `update_competitor_panel`
Currently shows a toast notification but doesn't actually refresh the CompetitorsPanel. Requires:
- Adding action to `useAnalyticsStore` to update competitors
- Triggering re-fetch or direct update from WebSocket message

---

## 📝 Usage Example

Once deployed, the agent can trigger UI updates during conversations:

```python
# In agent tool execution
send_ui_update(
    type="show_competitor_context",
    payload={
        "company_name": "Anki",
        "product_name": "Anki App",
        "website": "ankiapp.com",
        "description": "Spaced repetition flashcard app for learning",
        "category": "Direct Competitors"
    }
)

send_ui_update(
    type="show_insight",
    payload={
        "title": "Market Gap Identified",
        "content": "Your competitors lack mobile-first features. This presents an opportunity to differentiate.",
        "severity": "success"
    }
)

send_ui_update(
    type="show_notification",
    payload={
        "message": "Analyzing 10 competitors...",
        "type": "info"
    }
)
```

---

## 🎯 Next Steps

1. **Deploy Infrastructure**: Run `cdk deploy` in infrastructure directory
2. **Configure Environment**: Update backend and frontend `.env` files with outputs
3. **Test Connection**: Verify WebSocket connects when agent responds
4. **Test Agent Tool**: Ask agent to analyze competitors and verify UI updates appear
5. **Monitor**: Check CloudWatch logs for WebSocket connections and messages

---

## 📚 Documentation

### File Structure
```
infrastructure/
├── infrastructure/infrastructure_stack.py  # WebSocket API + DDB
├── lambda/
│   ├── websocket_connect.py               # $connect handler
│   └── websocket_disconnect.py            # $disconnect handler

backend/
├── main.py                                 # Agent with send_ui_update tool
└── websocket_helper.py                     # WebSocket messaging utilities

web/
├── types/websocket-messages.ts             # Message type definitions
├── lib/websocket-client.ts                 # WebSocket client
├── stores/ui-store.ts                      # Dynamic UI state
├── hooks/useWebSocketUI.ts                 # WebSocket hook
├── components/dashboard/
│   ├── dynamic-competitor-card.tsx         # Competitor card
│   ├── insight-card.tsx                    # Insight card
│   └── dynamic-ui-overlay.tsx              # Overlay container
└── app/dashboard/page.tsx                  # Dashboard integration
```

### Key Concepts

- **Identity-based Routing**: WebSocket messages are routed to users by their Cognito Identity ID
- **Connection Lifecycle**: Connects during agent response, disconnects when complete
- **Auto-cleanup**: Cards auto-dismiss after 30s, notifications after 5s
- **Type-safe**: Full TypeScript typing for all message payloads
- **Graceful Degradation**: If WebSocket fails, agent continues working normally

---

Last Updated: 2025-10-06
Branch: `feature/websocket-dynamic-ui`
