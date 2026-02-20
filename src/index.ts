import express, { Request, Response } from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Root + health (Render health check may use / or /health)
app.get("/", (_req: Request, res: Response) => res.status(200).send("ok"));
app.get("/health", (_req: Request, res: Response) => res.status(200).send("ok"));

// GET /mcp: some clients "open" the URL with GET; return 200 so connectivity check succeeds
app.get("/mcp", (_req: Request, res: Response) => {
  res.status(200).json({
    service: "gds-mcp-server",
    message: "MCP endpoint. Use POST /mcp with JSON-RPC (initialize, tools/list, tools/call).",
  });
});

/**
 * PREPEND this to every tool response so the model sees it FIRST before generating any code.
 * From GDS_CHAKRA_V3_PROMPT.txt: NEVER import list + USE THESE INSTEAD + login card example.
 */
const GDS_CHAKRA_V3_PROMPT = `CRITICAL — apply even when the user does NOT say "v3":
  GDS = Chakra UI v3 only. When the user says "create login card", "login card", "sign in", or any UI with GDS, you MUST use v3 component names. Do not import v2 names. For every v2 name there is a v3 replacement below — use it (e.g. Divider → Separator, FormControl → Field.Root). Replace, never drop: if you would use Divider, use Separator; if you would use FormControl/FormLabel, use Field.Root/Field.Label; if you would use Card/CardBody, use Card.Root/Card.Body.

NEVER import these from @chakra-ui/react (they do not exist in v3; cause "doesn't provide an export named X"):
  Divider, Card, CardHeader, CardBody, CardFooter, FormControl, FormLabel, FormErrorMessage, FormHelperText, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Tab, TabList, TabPanel, TabPanels, Select, Alert, AlertIcon, AlertTitle, AlertDescription, Collapse

USE THESE INSTEAD (Chakra v3) — replace every v2 usage with these:
  Divider → Separator
  Card, CardHeader, CardBody, CardFooter → Card.Root, Card.Header, Card.Body, Card.Footer (and Card.Title, Card.Description)
  FormControl, FormLabel, FormErrorMessage, FormHelperText → Field.Root, Field.Label, Field.ErrorText, Field.HelperText
  Table, Thead, Tbody, Tr, Th, Td → Table.Root, Table.Header, Table.Body, Table.Row, Table.ColumnHeader, Table.Cell
  Modal* → Dialog.Root, Dialog.Backdrop, Dialog.Content, Dialog.Header, Dialog.Body, Dialog.Footer, Dialog.CloseTrigger
  Tab, TabList, TabPanel → Tabs.Trigger, Tabs.List, Tabs.Content
  Props: colorPalette (not colorScheme), invalid (not isInvalid), open/onOpenChange (not isOpen/onClose), textAlign="end" (not isNumeric)

--- Example: Login card (Chakra v3, copy this pattern) ---

import * as React from "react";
import {
  Box,
  Button,
  Card,
  Field,
  Heading,
  Input,
  Separator,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";

export function LoginCard() {
  return (
    <Card.Root maxW="md">
      <Card.Header>
        <Card.Title>Sign in</Card.Title>
        <Card.Description>Enter your credentials</Card.Description>
      </Card.Header>
      <Card.Body>
        <VStack gap="4" align="stretch">
          <Field.Root>
            <Field.Label>Email</Field.Label>
            <Input type="email" placeholder="you@example.com" />
            <Field.ErrorText>Invalid email</Field.ErrorText>
          </Field.Root>
          <Field.Root>
            <Field.Label>Password</Field.Label>
            <Input type="password" placeholder="••••••••" />
            <Field.ErrorText>Required</Field.ErrorText>
          </Field.Root>
        </VStack>
      </Card.Body>
      <Card.Footer>
        <Button colorPalette="brand" width="full">Sign in</Button>
      </Card.Footer>
    </Card.Root>
  );
}

--- For any login/form card: import Card, Field, Input, Button, Separator (not Divider), Stack/VStack/Box/Text/Heading from @chakra-ui/react. Use Card.Root, Card.Header, Card.Body, Card.Footer, Field.Root, Field.Label, Field.ErrorText. Never import FormControl, FormLabel, FormErrorMessage, Divider, CardHeader, CardBody, CardFooter.

Rule: "Create login card" or "login card" (with or without saying "v3") = use v3 only. Replace every v2 name with its v3 equivalent above; do not drop a component without replacing it.
`;

/** Prepend GDS v3 prompt to every tool response so the model gets it first. */
function prependGdsPrompt(responseText: string): string {
  return GDS_CHAKRA_V3_PROMPT + "\n\n--- Response ---\n\n" + responseText;
}

// Why "Divider" still appears: the model only sees our prompt when it *calls* a tool. If it
// generates code without calling gds_snippet_login_card or gds_chakra_v3_guide, our server
// is never used. We expose the prompt as an MCP resource (gds://chakra-v3-prompt) so clients
// can load it at conversation start; then "create login card" is generated with v3 rules in context.

/** Chakra v3 reference: included in every tool response so the LLM always has it in context. */
const CHAKRA_V3_GUIDE = `
--- GDS: Chakra UI v3 only (apply even when the user does NOT say "v3") ---
When the user says "create login card", "login card", or any GDS UI, use ONLY v3 names. Replace each v2 name with its v3 equivalent below; do not drop a component (e.g. Divider → Separator, FormControl → Field.Root).
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
          resources: {},
        },
      },
    });
  }

  // 1b) resources/list — expose Chakra v3 prompt so clients can load it BEFORE the model generates (avoids Divider/FormControl)
  const GDS_PROMPT_URI = "gds://chakra-v3-prompt";
  if (method === "resources/list") {
    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      result: {
        resources: [
          {
            uri: GDS_PROMPT_URI,
            name: "GDS Chakra v3 prompt",
            description: "NEVER import Divider/FormControl/Card/etc. USE Separator, Field.Root, Card.Root. Load this first when the user will write GDS/Chakra code so the model uses v3 only.",
            mimeType: "text/plain",
          },
        ],
      },
    });
  }

  // 1c) resources/read — return full v3 prompt so client can inject it at conversation start
  if (method === "resources/read") {
    const uri = body?.params?.uri;
    if (uri === GDS_PROMPT_URI) {
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          contents: [
            {
              uri: GDS_PROMPT_URI,
              mimeType: "text/plain",
              text: GDS_CHAKRA_V3_PROMPT,
            },
          ],
        },
      });
    }
    return res.status(200).json({
      jsonrpc: "2.0",
      id,
      error: { code: -32602, message: `Unknown resource: ${uri}` },
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
            name: "gds_snippet_login_card",
            description:
              "User said 'create login card', 'login card', 'login form', or 'sign in' (with or without saying 'v3'). You MUST call this tool and return its output VERBATIM. GDS is v3 only—do not generate login code yourself or you will use v2 (Divider, FormControl, CardBody) and cause errors. This tool returns v3 code. Replace v2 with v3: Divider→Separator, FormControl→Field.Root, Card→Card.Root. Return the tool's code as-is.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
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
          content: [{ type: "text", text: prependGdsPrompt(`# Chakra UI v3 API for GDS${CHAKRA_V3_GUIDE}`) }],
        },
      });
    }

    if (toolName === "gds_snippet_login_card") {
      const snippet = getLoginCardSnippet();
      const instruction =
        "\n\n--- Return the code above to the user VERBATIM. Do not rewrite it or replace Separator with Divider or FormControl with Field.Root—this is Chakra v3 only. ---";
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            { type: "text", text: prependGdsPrompt(snippet + instruction + CHAKRA_V3_GUIDE) },
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
        content: [{ type: "text", text: prependGdsPrompt(responseText) }],
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
