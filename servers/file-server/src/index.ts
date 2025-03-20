#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { OpenAI } from 'openai/index.mjs';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
console.error("Environment loaded");

// Initialize the OpenAI client
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY environment variable is missing");
  throw new Error("OPENAI_API_KEY environment variable is required");
}

console.error("API Key available");

const client = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Vector store ID - replace with your actual vector store ID
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID;
if (!VECTOR_STORE_ID) {
  console.error("ERROR: VECTOR_STORE_ID environment variable is missing");
  throw new Error("VECTOR_STORE_ID environment variable is required");
}

console.error(`Using vector store: ${VECTOR_STORE_ID}`);

// Create an MCP server instance
const server = new Server({
  name: "file-search-server",
  version: "0.1.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Set up error handling
server.onerror = (error) => {
  console.error("MCP Server Error:", error);
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

// Register tools
server.setRequestHandler(
  ListToolsRequestSchema,
  async () => {
    console.error("Handling ListToolsRequest");
    return {
      tools: [
        {
          name: "search_files",
          description: "Search through your files using OpenAI's file search capability",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find relevant information in your files"
              },
              max_results: {
                type: "number",
                description: "Maximum number of results to return (default: 5)",
                default: 5
              }
            },
            required: ["query"]
          }
        },
        {
          name: "list_vector_stores",
          description: "List all available vector stores in your OpenAI account",
          inputSchema: {
            type: "object",
            properties: {}
          }
        }
      ]
    };
  }
);

// Handle tool calls
server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    console.error("Handling CallToolRequest:", JSON.stringify(request.params));
    
    try {
      switch (request.params.name) {
        case "search_files": {
          const args = request.params.arguments as { query: string; max_results?: number };
          
          if (!args || typeof args !== "object" || typeof args.query !== "string" || !args.query.trim()) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Invalid search arguments: query is required and must be a non-empty string"
            );
          }
          
          const { query, max_results = 5 } = args;
          console.error(`Searching files with query: "${query}", max results: ${max_results}`);
          
          try {
            // Create a response with file search
            const response = await client.responses.create({
              model: "gpt-4o",
              input: query,
              tools: [{
                type: "file_search",
                vector_store_ids: [VECTOR_STORE_ID],
                max_num_results: max_results
              }],
              include: ["file_search_call.results"]
            });
            
            let resultText = "";
            
            // Process results
            for (const output of response.output) {
              if ('results' in output && output.results) {
                resultText += "### Search Results:\n\n";
                for (const result of output.results) {
                  resultText += `**File:** ${result.filename}\n`;
                  resultText += `**Score:** ${result.score}\n`;
                  // Safely access text property
                  const text = result.text || "";
                  resultText += `**Text excerpt:**\n\`\`\`\n${text.substring(0, 500)}${text.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
                }
              } else if ('content' in output) {
                resultText += "### AI Response:\n\n";
                for (const content of output.content) {
                  if ('text' in content) {
                    resultText += `${content.text}\n\n`;
                  }
                }
              }
            }
            
            console.error("Search completed successfully");
            
            return {
              content: [{
                type: "text",
                text: resultText || "No results found."
              }]
            };
          } catch (error) {
            console.error("ERROR during OpenAI API call:", error);
            
            return {
              content: [{
                type: "text",
                text: `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
              }],
              isError: true
            };
          }
        }
        
        case "list_vector_stores": {
          console.error("Listing vector stores");
          
          try {
            const vectorStores = await client.vectorStores.list();
            let resultText = "### Vector Stores:\n\n";
            
            for (const store of vectorStores.data) {
              resultText += `- **ID:** ${store.id}\n`;
              resultText += `  **Name:** ${store.name}\n`;
              resultText += `  **Created At:** ${new Date(store.created_at * 1000).toISOString()}\n\n`;
            }
            
            console.error(`Found ${vectorStores.data.length} vector stores`);
            
            return {
              content: [{
                type: "text",
                text: resultText
              }]
            };
          } catch (error) {
            console.error("ERROR during OpenAI API call:", error);
            
            return {
              content: [{
                type: "text",
                text: `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
              }],
              isError: true
            };
          }
        }
        
        default:
          console.error("ERROR: Unknown tool requested:", request.params.name);
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    } catch (error) {
      console.error("ERROR during tool execution:", error);
      
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function run() {
  console.error("Starting File Search MCP server");
  
  try {
    const transport = new StdioServerTransport();
    console.error("StdioServerTransport created");
    
    await server.connect(transport);
    console.error("Server connected to transport");
    
    console.error("File Search MCP server running on stdio");
  } catch (error) {
    console.error("ERROR starting server:", error);
    throw error;
  }
}

// Main execution
run().catch(error => {
  console.error("Server runtime error:", error);
  process.exit(1);
});