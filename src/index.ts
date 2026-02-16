import express, { Request, Response } from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Health check (Render)
app.get("/health", (_req: Request, res: Response) => res.status(200).send("ok"));

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

// MCP-like endpoint (MVP): handles tools/call only
app.post("/mcp", (req: Request, res: Response) => {
  const body: any = req.body;

  // Enforce Accept header like MCP streamable HTTP clients do
  const accept = String(req.headers.accept || "");
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
    return res.status(406).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Not Acceptable: Client must accept both application/json and text/event-stream",
      },
      id: null,
    });
  }

  if (body?.method !== "tools/call") {
    return res.status(200).json({
      jsonrpc: "2.0",
      id: body?.id ?? null,
      error: { code: -32601, message: "Only tools/call is supported in this MVP" },
    });
  }

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

  // Return JSON-RPC response (works with your curl and with app callers)
  return res.status(200).json({
    jsonrpc: "2.0",
    id: body?.id ?? null,
    result: {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    },
  });
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`GDS MCP server listening on http://0.0.0.0:${PORT}`);
});
