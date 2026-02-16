import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Health check (Render)
app.get("/health", (_req: Request, res: Response) => res.status(200).send("ok"));


function buildServer() {
  const server = new McpServer({
    name: "gds-mcp-server",
    version: "0.1.0",
  });

  // Define the tool so clients can discover it via tools/list
  server.tool(
    "gds_generate_component",
    {
      description:
        "Generates a React (TS) component using Chakra + GDS tokens + @gdesignsystem/icons. Returns files[].",
      // JSON Schema (keeps it simple; no Zod compat issues)
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Component name, e.g. LoginCard" },
          purpose: { type: "string", description: "What the component does" },
        },
        required: ["name", "purpose"],
        additionalProperties: false,
      },
    },
    // NOTE: We intentionally won't rely on args plumbing here.
    // Actual tools/call is handled in /mcp route below for reliability.
    async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { note: "Use tools/call on /mcp; this tool is discoverable via tools/list." },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}

function generateComponentFiles(name: string, purpose: string) {
  const code = `import React from "react";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { CheckIcon } from "@gdesignsystem/icons";

export type ${name}Props = {
  title?: string;
};

export function ${name}({ title = "${name}" }: ${name}Props) {
  return (
    <Box bg="bg.default" borderColor="border.muted" borderWidth="1px" p={6} borderRadius="md">
      <Heading size="md" color="fg">{title}</Heading>
      <Text mt={2} color="fg.muted">
        ${purpose}
      </Text>

      <Button mt={4} colorScheme="brand" leftIcon={<CheckIcon aria-hidden />}>
        Action
      </Button>
    </Box>
  );
}
`;

  return {
    files: [
      { path: `src/components/${name}.tsx`, content: code },
      { path: `src/components/index.ts`, content: `export * from "./${name}";\n` },
    ],
    notes: [
      "Wrap your app with GDSProvider from @gdesignsystem/react.",
      "Prefer semantic tokens like bg.default / fg / border.muted.",
    ],
  };
}

// MCP endpoint
app.post("/mcp", async (req: Request, res: Response) => {
  const body: any = req.body;

  // ✅ MVP: handle tools/call directly for reliable arg parsing
  if (body?.method === "tools/call") {
    const toolName = body?.params?.name;
    const toolArgs = body?.params?.arguments;

    if (toolName !== "gds_generate_component") {
      return res.status(200).json({
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32601, message: `Unknown tool: ${toolName}` },
      });
    }

    const name = toolArgs?.name;
    const purpose = toolArgs?.purpose;

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(200).json({
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32602, message: "Missing or invalid argument: name" },
      });
    }

    if (typeof purpose !== "string" || purpose.trim().length === 0) {
      return res.status(200).json({
        jsonrpc: "2.0",
        id: body?.id ?? null,
        error: { code: -32602, message: "Missing or invalid argument: purpose" },
      });
    }

    const payload = generateComponentFiles(name, purpose);

    return res.status(200).json({
      jsonrpc: "2.0",
      id: body?.id ?? null,
      result: {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      },
    });
  }

  // ✅ For other MCP methods (e.g., tools/list), let the MCP transport handle it
  const server = buildServer();

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, body);

    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`GDS MCP server listening on http://0.0.0.0:${PORT}`);
});
