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
              "Generates a React (TS) component using Chakra UI v3 + GDS tokens + @gdesignsystem/icons. IMPORTANT: GDS uses Chakra v3 only. Use colorPalette (not colorScheme), icons as children (not leftIcon/rightIcon), Field.Root/Field.Label (not FormControl/FormLabel), Table.Root/Table.Header/Table.Body etc. (not Table/Thead/Tbody/Tr/Th/Td). Returns files[] and notes with v3 reminders.",
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
              "Returns the Chakra UI v3 API rules for GDS. Call this when generating any React/Chakra code for GDS so you use v3 component names and props (e.g. colorPalette not colorScheme, Field not FormControl, Table.Root not Table). Prevents 'doesn't provide an export named X' runtime errors.",
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
      const guide = `# Chakra UI v3 API for GDS (use these, not v2)

GDS uses **Chakra UI v3 only**. Using v2 component names causes runtime errors: "doesn't provide an export named X".

## Props
- Use **colorPalette** (not colorScheme) on Button, Badge, Alert, etc.
- Button: put icons as **children** (not leftIcon/rightIcon). Example: <Button><CheckIcon /> Label</Button>
- Modal: use **open** / **onOpenChange** (not isOpen/onClose)
- Form: use **invalid** on Field.Root (not isInvalid on FormControl)

## Component renames (v2 → v3)
- **Forms:** FormControl, FormLabel, FormHelperText, FormErrorMessage → **Field.Root, Field.Label, Field.HelperText, Field.ErrorText**
- **Tables:** Table, Thead, Tbody, Tr, Th, Td, TableContainer → **Table.Root, Table.Header, Table.Body, Table.Row, Table.ColumnHeader, Table.Cell, Table.ScrollArea** (use textAlign="end" instead of isNumeric)
- **Modal:** Modal, ModalOverlay, ModalContent, etc. → **Dialog.Root, Dialog.Backdrop, Dialog.Positioner, Dialog.Content, Dialog.Header, Dialog.Title, Dialog.Body, Dialog.Footer, Dialog.CloseTrigger**
- **Other:** Divider → Separator; Collapse → Collapsible.Root + Collapsible.Content; Select → NativeSelect.Root/Field/Indicator; Alert/AlertIcon → Alert.Root/Alert.Indicator/Alert.Content/Alert.Title/Alert.Description; Avatar → Avatar.Root/Image/Fallback; CircularProgress → ProgressCircle.Root/Circle/Track/Range
- **Tabs:** Tab, TabList, TabPanel, TabPanels → **Tabs.Trigger, Tabs.List, Tabs.Content** (use value; no TabPanels wrapper)
- **Accordion:** AccordionButton, AccordionIcon → **Accordion.Trigger, Accordion.ItemIndicator**; allowMultiple→multiple, allowToggle→collapsible, index→value

When generating GDS UI code, always use the v3 names and props above.`;
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: guide }],
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

    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
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
