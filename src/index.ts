import express, { Request, Response } from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Health check (Render)
app.get("/health", (_req: Request, res: Response) => res.status(200).send("ok"));

/** Chakra v3 reference: included in every tool response so the LLM always has it in context. */
const CHAKRA_V3_GUIDE = `
--- GDS: Chakra UI v3 only (use these names or you get "doesn't provide an export named X") ---
Applies to ALL GDS UI: dashboard, inbox, content page, form, card, layout, settings, list, table, modal, tabs, etc. When the user asks for ANY screen or component with GDS, use ONLY the v3 names below.
Do NOT use: Divider → use Separator
Do NOT use: FormControl, FormLabel, FormHelperText, FormErrorMessage → use Field.Root, Field.Label, Field.HelperText, Field.ErrorText
Do NOT use: Card, CardHeader, CardBody, CardFooter → use Card.Root, Card.Header, Card.Body, Card.Footer (and Card.Title, Card.Description)
Do NOT use: Checkbox (flat) → use Checkbox.Root, Checkbox.HiddenInput, Checkbox.Control, Checkbox.Indicator, Checkbox.Label
Do NOT use: InputRightElement, InputLeftElement → use InputGroup with endElement or startElement prop (node, not a component)
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
When writing ANY GDS/Chakra code (dashboard, inbox, content page, form, card, layout, etc.), use ONLY the v3 names above.
---`;

/** Production-ready LoginCard in Chakra v3 only (Separator, Field.*, Card.*, Checkbox.Root, InputGroup endElement). */
function getLoginCardSnippet(): string {
  return `import * as React from "react";
import {
  Box,
  Button,
  Card,
  Checkbox,
  Field,
  Heading,
  IconButton,
  Input,
  InputGroup,
  Link,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";

export function LoginCard() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    // Add validation and submit
  };

  return (
    <Card.Root maxW="md" mx="auto">
      <Card.Header>
        <Card.Title asChild>
          <Heading size="lg" color="fg">Sign in</Heading>
        </Card.Title>
        <Text color="fg.muted" mt="1">Use your email and password</Text>
      </Card.Header>
      <Separator />
      <Card.Body>
        <form onSubmit={handleSubmit}>
          <Stack gap="4">
            <Field.Root invalid={!!emailError}>
              <Field.Label>Email</Field.Label>
              <Input type="email" placeholder="you@example.com" />
              <Field.ErrorText>{emailError}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={!!passwordError}>
              <Field.Label>Password</Field.Label>
              <InputGroup
                endElement={
                  <IconButton
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </IconButton>
                }
              >
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                />
              </InputGroup>
              <Field.ErrorText>{passwordError}</Field.ErrorText>
            </Field.Root>

            <Checkbox.Root>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Remember me</Checkbox.Label>
            </Checkbox.Root>

            <Button type="submit" colorPalette="brand" width="full">
              Sign in
            </Button>
          </Stack>
        </form>
      </Card.Body>
      <Separator />
      <Card.Footer>
        <Link href="#" color="fg.muted" textStyle="sm">
          Forgot password?
        </Link>
      </Card.Footer>
    </Card.Root>
  );
}
`;
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
              "Generates a React (TS) component using Chakra UI v3 + GDS. Use for ANY GDS UI: dashboard, inbox, content page, card, layout, list, table, etc. For login/sign-in forms use gds_snippet_login_card instead. Before generating ANY GDS code in this chat, call gds_chakra_v3_guide first if you have not yet; then use ONLY v3 names (Separator not Divider, Field.Root not FormControl, Card.Root not Card, etc.). Returns files[] and v3 reference.",
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
              "Call this FIRST whenever the user asks for ANY UI with GDS: dashboard, inbox, content page, form, card, layout, settings, list, table, modal, etc. Returns Chakra v3 renames (Divider→Separator, FormControl→Field.Root, Card→Card.Root, Checkbox→Checkbox.Root, InputRightElement→InputGroup endElement, colorScheme→colorPalette, Table→Table.Root, Modal→Dialog.*). Use ONLY these names when generating code. Prevents 'doesn't provide an export named X' errors.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: "gds_snippet_login_card",
            description:
              "Returns a production-ready LoginCard in Chakra v3 only. Use when the user asks for a login form, sign-in card, or email+password form with GDS. For any other GDS UI (dashboard, inbox, content page, etc.) call gds_chakra_v3_guide first then generate code using only v3 names.",
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

    if (toolName === "gds_snippet_login_card") {
      const snippet = getLoginCardSnippet();
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            { type: "text", text: snippet + CHAKRA_V3_GUIDE },
          ],
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
