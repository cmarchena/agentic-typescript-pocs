// ============================================
// MCP (Model Context Protocol) Client/Server POC
// Functional TypeScript with Interfaces
// ============================================

// ============================================
// Core Types & Interfaces
// ============================================

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}
// This is the server metadata information
interface ServerInfo {
  name: string;
  version: string;
  capabilities: string[];
}

// ============================================
// MCP Server Interface
// ============================================

interface MCPServer {
  info: ServerInfo;
  listTools: () => Promise<Tool[]>;
  executeTool: (call: ToolCall) => Promise<ToolResult>;
}

interface ToolImplementation {
  handler: (args: Record<string, unknown>) => Promise<unknown>;
  schema: Tool;
}

// ============================================
// MCP Client Interface
// ============================================

interface MCPClient {
  connect: (server: MCPServer) => Promise<void>;
  disconnect: () => Promise<void>;
  discoverTools: () => Promise<Tool[]>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
}

// ============================================
// Server Implementation
// ============================================

const createMCPServer = (
  name: string,
  version: string,
  tools: Record<string, ToolImplementation>
): MCPServer => {
  return {
    info: {
      name,
      version,
      capabilities: ['tools']
    },

    listTools: async () => {
      return Object.values(tools).map(t => t.schema);
    },

    executeTool: async (call: ToolCall) => {
      const tool = tools[call.name];

      if (!tool) {
        return {
          id: call.id,
          success: false,
          error: `Tool '${call.name}' not found`
        };
      }

      try {
        const result = await tool.handler(call.arguments);
        return {
          id: call.id,
          success: true,
          result
        };
      } catch (error) {
        return {
          id: call.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
};

// ============================================
// Client Implementation
// ============================================

const createMCPClient = (): MCPClient => {
  let connectedServer: MCPServer | null = null;
  let availableTools: Tool[] = [];

  return {
    connect: async (server: MCPServer) => {
      console.log(`📡 Connecting to MCP server: ${server.info.name}`);
      connectedServer = server;
      availableTools = await server.listTools();
      console.log(`✅ Connected! Discovered ${availableTools.length} tools`);
    },

    disconnect: async () => {
      if (connectedServer) {
        console.log(`👋 Disconnecting from ${connectedServer.info.name}`);
        connectedServer = null;
        availableTools = [];
      }
    },

    discoverTools: async () => {
      if (!connectedServer) {
        throw new Error('Not connected to any server');
      }
      return availableTools;
    },

    callTool: async (name: string, args: Record<string, unknown>) => {
      if (!connectedServer) {
        throw new Error('Not connected to any server');
      }

      const toolCall: ToolCall = {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        arguments: args
      };

      console.log(`🔧 Calling tool: ${name}`);
      const result = await connectedServer.executeTool(toolCall);
      
      if (result.success) {
        console.log(`✅ Tool succeeded`);
      } else {
        console.log(`❌ Tool failed: ${result.error}`);
      }

      return result;
    }
  };
};

// ============================================
// Example Tool Implementations
// ============================================

// CRM Server Tools
const createCRMTools = (): Record<string, ToolImplementation> => {
  // Mock database
  const customers: Record<string, unknown>[] = [
    { id: '1', name: 'Acme Corp', email: 'contact@acme.com', revenue: 150000 },
    { id: '2', name: 'TechStart Inc', email: 'info@techstart.com', revenue: 75000 },
    { id: '3', name: 'Global Solutions', email: 'hello@global.com', revenue: 200000 }
  ];

  return {
    search_customers: {
      schema: {
        name: 'search_customers',
        description: 'Search for customers in the CRM by name or email',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Max results', default: 10 }
          },
          required: ['query']
        }
      },
      handler: async (args) => {
        const query = (args.query as string).toLowerCase();
        const limit = (args.limit as number) || 10;

        const results = customers.filter(c => {
          const name = (c.name as string).toLowerCase();
          const email = (c.email as string).toLowerCase();
          return name.includes(query) || email.includes(query);
        }).slice(0, limit);

        return { found: results.length, customers: results };
      }
    },

    create_customer: {
      schema: {
        name: 'create_customer',
        description: 'Create a new customer in the CRM',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Customer name' },
            email: { type: 'string', description: 'Customer email' },
            revenue: { type: 'number', description: 'Expected annual revenue' }
          },
          required: ['name', 'email']
        }
      },
      handler: async (args) => {
        const newCustomer = {
          id: (customers.length + 1).toString(),
          name: args.name,
          email: args.email,
          revenue: args.revenue || 0
        };
        customers.push(newCustomer);
        return { created: true, customer: newCustomer };
      }
    },

    get_revenue_stats: {
      schema: {
        name: 'get_revenue_stats',
        description: 'Get revenue statistics across all customers',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      handler: async () => {
        const revenues = customers.map(c => c.revenue as number);
        const total = revenues.reduce((sum, r) => sum + r, 0);
        const average = total / revenues.length;
        const max = Math.max(...revenues);
        const min = Math.min(...revenues);

        return {
          total_customers: customers.length,
          total_revenue: total,
          average_revenue: average,
          max_revenue: max,
          min_revenue: min
        };
      }
    }
  };
};

// Email Server Tools
const createEmailTools = (): Record<string, ToolImplementation> => {
  const sentEmails: unknown[] = [];

  return {
    send_email: {
      schema: {
        name: 'send_email',
        description: 'Send an email to a recipient',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body content' },
            cc: { type: 'array', description: 'CC recipients', items: { type: 'string' } }
          },
          required: ['to', 'subject', 'body']
        }
      },
      handler: async (args) => {
        const email = {
          id: `email_${Date.now()}`,
          to: args.to,
          subject: args.subject,
          body: args.body,
          cc: args.cc || [],
          sent_at: new Date().toISOString()
        };
        sentEmails.push(email);
        return { sent: true, email };
      }
    },

    get_sent_emails: {
      schema: {
        name: 'get_sent_emails',
        description: 'Retrieve recently sent emails',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max emails to return', default: 10 }
          }
        }
      },
      handler: async (args) => {
        const limit = (args.limit as number) || 10;
        return { 
          count: sentEmails.length,
          emails: sentEmails.slice(-limit)
        };
      }
    }
  };
};

// ============================================
// Example Usage - Multi-Server Agent System
// ============================================

const runMCPExample = async (): Promise<void> => {
  console.log('🚀 MCP Client/Server POC - Starting...\n');

  // 1. Create MCP Servers
  const crmServer = createMCPServer('CRM-Server', '1.0.0', createCRMTools());
  const emailServer = createMCPServer('Email-Server', '1.0.0', createEmailTools());

  console.log('🖥️  Created servers:');
  console.log(`   - ${crmServer.info.name} v${crmServer.info.version}`);
  console.log(`   - ${emailServer.info.name} v${emailServer.info.version}\n`);

  // 2. Create Client
  const client = createMCPClient();

  // 3. Connect to CRM Server
  console.log('--- Connecting to CRM Server ---\n');
  await client.connect(crmServer);

  // 4. Discover and list available tools
  const crmTools = await client.discoverTools();
  console.log('\n📋 Available CRM Tools:');
  crmTools.forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });

  // 5. Use CRM tools
  console.log('\n--- Using CRM Tools ---\n');
  
  const searchResult = await client.callTool('search_customers', {
    query: 'tech'
  });
  console.log('Search result:', JSON.stringify(searchResult.result, null, 2));

  const statsResult = await client.callTool('get_revenue_stats', {});
  console.log('\nRevenue stats:', JSON.stringify(statsResult.result, null, 2));

  const createResult = await client.callTool('create_customer', {
    name: 'New Startup LLC',
    email: 'founder@newstartup.com',
    revenue: 50000
  });
  console.log('\nNew customer:', JSON.stringify(createResult.result, null, 2));

  // 6. Switch to Email Server
  console.log('\n--- Switching to Email Server ---\n');
  await client.disconnect();
  await client.connect(emailServer);

  const emailTools = await client.discoverTools();
  console.log('\n📋 Available Email Tools:');
  emailTools.forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });

  // 7. Use Email tools
  console.log('\n--- Using Email Tools ---\n');
  
  const sendResult = await client.callTool('send_email', {
    to: 'customer@example.com',
    subject: 'Welcome to our service!',
    body: 'Thank you for signing up. We are excited to work with you.'
  });
  console.log('Email sent:', JSON.stringify(sendResult.result, null, 2));

  // 8. Agent workflow: Create customer and send welcome email
  console.log('\n--- Agent Workflow: Multi-Server Orchestration ---\n');
  
  await client.disconnect();
  await client.connect(crmServer);
  
  console.log('Step 1: Creating new customer...');
  const newCustomer = await client.callTool('create_customer', {
    name: 'Agent Test Corp',
    email: 'test@agentcorp.com',
    revenue: 100000
  });

  await client.disconnect();
  await client.connect(emailServer);
  
  console.log('\nStep 2: Sending welcome email...');
  const customerData = newCustomer.result as { customer: { email: string; name: string } };
  await client.callTool('send_email', {
    to: customerData.customer.email,
    subject: 'Welcome!',
    body: `Hi ${customerData.customer.name}, welcome to our platform!`
  });

  console.log('\n✅ Agent workflow completed successfully!');
  
  await client.disconnect();
  console.log('\n✨ MCP POC Complete!\n');
};

// ============================================
// Production Integration Tips
// ============================================

/*
PRODUCTION IMPLEMENTATION:

1. Use Official MCP SDK:
   npm install 

2. Standard MCP Transport:
   - stdio (standard input/output for local processes)
   - HTTP/SSE (server-sent events for remote servers)
   - WebSocket (bidirectional communication)

3. Example with Official SDK:

   import { Server } from '@modelcontextprotocol/sdk/server/index.js';
   import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

   const server = new Server(
     { name: 'my-server', version: '1.0.0' },
     { capabilities: { tools: {} } }
   );

   server.setRequestHandler(ListToolsRequestSchema, async () => ({
     tools: [...]
   }));

4. Security Considerations:
   - Validate all tool inputs
   - Implement rate limiting
   - Use authentication tokens
   - Audit tool usage
   - Sandbox tool execution

5. Error Handling:
   - Retry logic for transient failures
   - Timeout handling
   - Graceful degradation
   - Detailed error logging

6. Monitoring:
   - Track tool call frequency
   - Monitor execution time
   - Log failures and successes
   - Alert on anomalies

7. Tool Discovery:
   - Dynamic tool registration
   - Version compatibility checks
   - Capability negotiation
   - Schema validation

8. Multi-Server Management:
   - Connection pooling
   - Load balancing
   - Failover strategies
   - Health checks

9. Real MCP Servers Available:
   - Filesystem: Read/write files
   - GitHub: Repository operations
   - Slack: Send messages, read channels
   - Postgres: Database queries
   - Puppeteer: Browser automation
   - Google Drive: Document access

10. Building Custom MCP Servers:
    - Identify your system's capabilities
    - Design clear, atomic tools
    - Write comprehensive descriptions
    - Provide good examples in schemas
    - Test with various AI models
*/

// Run the example
runMCPExample().catch(console.error);

export type {
  Tool,
  ToolCall,
  ToolResult,
  ServerInfo,
  MCPServer,
  MCPClient,
  ToolImplementation
};

export {
  createMCPServer,
  createMCPClient
};
