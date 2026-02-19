import express, { Request, Response } from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Health check (Render)
app.get("/health", (_req: Request, res: Response) => res.status(200).send("ok"));

/** Chakra v3 reference: included in every tool response so the LLM always has it in context. */
const CHAKRA_V3_GUIDE = `
--- GDS: Chakra UI v3 only (use these names or you get "doesn't provide an export named X") ---
Do NOT use: Divider → use Separator
Do NOT use: FormControl, FormLabel, FormHelperText, FormErrorMessage → use Field.Root, Field.Label, Field.HelperText, Field.ErrorText
Do NOT use: Table, Thead, Tbody, Tr, Th, Td, TableContainer → use Table.Root, Table.Header, Table.Body, Table.Row, Table.ColumnHeader, Table.Cell, Table.ScrollArea (use textAlign="end" not isNumeric)
Do NOT use: Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton → use Dialog.Root, Dialog.Backdrop, Dialog.Positioner, Dialog.Content, Dialog.Header, Dialog.Title, Dialog.Body, Dialog.Footer, Dialog.CloseTrigger
Do NOT use: colorScheme → use colorPalette
Do NOT use: leftIcon/rightIcon on Button → put icon as child: <Button><CheckIcon /> Label</Button>
Do NOT use: Collapse → use Collapsible.Root, Collapsible.Content (prop open not in)
Do NOT use: Select → use NativeSelect.Root, NativeSelect.Field, NativeSelect.Indicator
Do NOT use: Alert, AlertIcon, AlertTitle, AlertDescription → use Alert.Root, Alert.Indicator, Alert.Content, Alert.Title, Alert.Description
Do NOT use: Tab, TabList, TabPanel, TabPanels → use Tabs.Trigger, Tabs.List, Tabs.Content (value; no TabPanels)
Do NOT use: AccordionButton, AccordionIcon → use Accordion.Trigger, Accordion.ItemIndicator
Do NOT use: Avatar (flat) → use Avatar.Root, Avatar.Image, Avatar.Fallback
Do NOT use: CircularProgress → use ProgressCircle.Root, ProgressCircle.Circle, ProgressCircle.Track, ProgressCircle.Range
When writing any GDS/Chakra code in this chat, use ONLY the v3 names above.
---`;

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

      <Button mt={4} colorPalette="brand">
        <CheckIcon aria-hidden />
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
      "Use semantic tokens: bg.default, fg, fg.muted, border.muted.",
      "GDS uses Chakra UI v3 only: use colorPalette (not colorScheme), put icons as Button children (not leftIcon/rightIcon). Forms: Field.Root, Field.Label, Field.HelperText, Field.ErrorText (not FormControl/FormLabel). Tables: Table.Root, Table.Header, Table.Body, Table.Row, Table.ColumnHeader, Table.Cell (not Table/Thead/Tbody/Tr/Th/Td).",
    ],
  };
}

// Minimal MCP-ish JSON-RPC endpoint for ChatGPT connector creation
app.post("/mcp", (req: Request, res: Response) => {
  const body: any = req.body;

  // Some clients require this Accept header; keep it, but don't block connector creation too aggressively.
  const accept = String(req.headers.accept || "");
  if (accept && (!accept.includes("application/json") || !accept.includes("text/event-stream"))) {
    return res.status(406).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Not Acceptable: Client must accept both application/json and text/event-stream",
      },
      id: null,
    });
  }

  const id = body?.id ?? null;
  const method = body?.method;

  // 1) initialize (handshake)
  if (method === "initialize") {
    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: body?.params?.protocolVersion ?? "2024-11-05",
        serverInfo: { name: "gds-mcp-server", version: "0.2.0" },
        capabilities: {
          tools: {},
        },
      },
    });
  }

  // 2) tools/list (so ChatGPT can discover available tools)
  if (method === "tools/list") {
    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "gds_generate_component",
            description:
              "Generates a React (TS) component using Chakra UI v3 + GDS. NEVER use v2 names: use Separator not Divider, Field.Root not FormControl, Table.Root not Table, colorPalette not colorScheme, icons as Button children not leftIcon. Returns files[] and the v3 reference (included in every response).",
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
          {
            name: "gds_chakra_v3_guide",
            description:
              "Returns Chakra UI v3 rules for GDS. Call this before writing GDS/Chakra code. Critical: Divider→Separator, FormControl→Field.Root, Table→Table.Root, colorScheme→colorPalette. Prevents 'doesn't provide an export named X' errors.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      },
    });
  }

  // 3) tools/call (actual generation or guide)
  if (method === "tools/call") {
    const toolName = body?.params?.name;
    const toolArgs = body?.params?.arguments ?? {};

    if (toolName === "gds_chakra_v3_guide") {
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: `# Chakra UI v3 API for GDS${CHAKRA_V3_GUIDE}` }],
        },
      });
    }

    if (toolName !== "gds_generate_component") {
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown tool: ${toolName}` },
      });
    }

    const name = toolArgs?.name;
    const purpose = toolArgs?.purpose;

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Missing or invalid argument: name" },
      });
    }
    if (typeof purpose !== "string" || purpose.trim().length === 0) {
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: "Missing or invalid argument: purpose" },
      });
    }

    const payload = generateComponentFiles(name, purpose);
    const responseText =
      JSON.stringify(payload, null, 2) + CHAKRA_V3_GUIDE;

    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: responseText }],
      },
    });
  }

  // Optional: notifications/cancel or pings
  if (method === "ping") {
    return res.status(200).json({ jsonrpc: "2.0", id, result: {} });
  }

  // Default: method not found
  return res.status(200).json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Method not supported: ${method}` },
  });
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`GDS MCP server listening on http://0.0.0.0:${PORT}`);
});
