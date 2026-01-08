🚀 MCP Client/Server POC - Starting...

🖥️  Created servers:
   - CRM-Server v1.0.0
   - Email-Server v1.0.0

--- Connecting to CRM Server ---

📡 Connecting to MCP server: CRM-Server
✅ Connected! Discovered 3 tools

📋 Available CRM Tools:
   - search_customers: Search for customers in the CRM by name or email
   - create_customer: Create a new customer in the CRM
   - get_revenue_stats: Get revenue statistics across all customers

--- Using CRM Tools ---

🔧 Calling tool: search_customers
✅ Tool succeeded
Search result: {
  "found": 1,
  "customers": [
    {
      "id": "2",
      "name": "TechStart Inc",
      "email": "info@techstart.com",
      "revenue": 75000
    }
  ]
}
🔧 Calling tool: get_revenue_stats
✅ Tool succeeded

Revenue stats: {
  "total_customers": 3,
  "total_revenue": 425000,
  "average_revenue": 141666.66666666666,
  "max_revenue": 200000,
  "min_revenue": 75000
}
🔧 Calling tool: create_customer
✅ Tool succeeded

New customer: {
  "created": true,
  "customer": {
    "id": "4",
    "name": "New Startup LLC",
    "email": "founder@newstartup.com",
    "revenue": 50000
  }
}

--- Switching to Email Server ---

👋 Disconnecting from CRM-Server
📡 Connecting to MCP server: Email-Server
✅ Connected! Discovered 2 tools

📋 Available Email Tools:
   - send_email: Send an email to a recipient
   - get_sent_emails: Retrieve recently sent emails

--- Using Email Tools ---

🔧 Calling tool: send_email
✅ Tool succeeded
Email sent: {
  "sent": true,
  "email": {
    "id": "email_1767353315356",
    "to": "customer@example.com",
    "subject": "Welcome to our service!",
    "body": "Thank you for signing up. We are excited to work with you.",
    "cc": [],
    "sent_at": "2026-01-02T11:28:35.356Z"
  }
}

--- Agent Workflow: Multi-Server Orchestration ---

👋 Disconnecting from Email-Server
📡 Connecting to MCP server: CRM-Server
✅ Connected! Discovered 3 tools
Step 1: Creating new customer...
🔧 Calling tool: create_customer
✅ Tool succeeded
👋 Disconnecting from CRM-Server
📡 Connecting to MCP server: Email-Server
✅ Connected! Discovered 2 tools

Step 2: Sending welcome email...
🔧 Calling tool: send_email
✅ Tool succeeded

✅ Agent workflow completed successfully!
👋 Disconnecting from Email-Server

✨ MCP POC Complete!
