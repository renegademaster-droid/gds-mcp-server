import express, { Request, Response } from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Root + health (Render health check may use / or /health)
app.get("/", (_req: Request, res: Response) => res.status(200).send("ok"));
app.get("/health", (_req: Request, res: Response) => res.status(200).send("ok"));

// Tools list (same as MCP tools/list) — reused in GET /mcp and GET /mcp/tools
const MCP_TOOLS_LIST = [
  { name: "gds_generate_from_prompt", description: "Call with user's exact prompt. Returns GDS React (Chakra v3) code. Show response as main answer.", inputSchema: { prompt: "string" } },
  { name: "gds_snippet_login_card", description: "Ready LoginCard code (Chakra v3). Use for login/sign-in. Return as-is.", inputSchema: {} },
  { name: "gds_generate_component", description: "Generate component (name + purpose). Chakra v3 only.", inputSchema: { name: "string", purpose: "string" } },
  { name: "gds_chakra_v3_guide", description: "Chakra v3 renames (Divider->Separator, FormControl->Field.Root). Call first for any GDS UI.", inputSchema: {} },
];

// GET /mcp: one-shot info for clients that cannot POST — tools list + GET URLs (no POST needed)
app.get("/mcp", (req: Request, res: Response) => {
  const base = `${req.protocol}://${req.get("host") || "gds-mcp-server.onrender.com"}`;
  const generateUrl = (prompt: string) => `${base}/mcp/generate?prompt=${encodeURIComponent(prompt)}`;
  res.status(200).json({
    service: "gds-mcp-server",
    note: "No POST needed. You do not need MCP connected to your toolchain. Open the GET URLs (e.g. openWithGet.loginCardCode, openWithGet.chakraV3Rules), read the content, and use it as the source for your answers.",
    targetPlatform: "React web, Chakra UI v3, @gdesignsystem/react + @gdesignsystem/theme + @gdesignsystem/icons. NOT React Native, NOT Figma.",
    instructionsForAssistant: [
      "GDS is always React web (Chakra UI v3). When the user asks for a view/screen/form with GDS, return a full React/TSX code example. Do not return only a structure or spec.",
      "MANDATORY when user asks for login/signin/kirjaudu with GDS: (1) Open openWithGet.loginCardCode below with GET. (2) In the response you will see React code after '--- Login card'. (3) Show that code to the user as your main answer. Do not suggest other approaches first; fetch the snippet and show it.",
      "For other GDS UI (dashboard, form): open openWithGet.generateForPrompt with the user's request URL-encoded in the prompt parameter, then use the returned content to write your answer.",
      "Do not ask 'React Native or web?' — GDS is web. Reply with runnable React code, not only layout or component names.",
    ],
    whenUserSaysGdsLogin: "Your first action: open " + base + "/mcp/snippet/login with GET. Then show the React code from that response to the user. Do this before any other suggestion.",
    forChatGPTConnector: "You are reading this because the user has the GDS MCP server as connector. When they ask for GDS-based UI (login, signin, kirjaudu, lomake, 'GDS:llä'): immediately open openWithGet.loginCardCode for login/signin, or openWithGet.generateForPrompt with their request for other UI. Use the fetched content as your answer. Do not suggest alternatives before fetching.",
    toolsList: MCP_TOOLS_LIST,
    toolNames: MCP_TOOLS_LIST.map((t) => t.name),
    openWithGet: {
      loginCardCode: `${base}/mcp/snippet/login`,
      generateForPrompt: `${base}/mcp/generate?prompt=USER_REQUEST`,
      chakraV3Rules: `${base}/mcp/guide`,
      componentApi: `${base}/mcp/components`,
      tokensAndStyles: `${base}/mcp/tokens`,
      platformAndSetup: `${base}/mcp/platform`,
      toolsListAgain: `${base}/mcp/tools`,
    },
    exampleSigninRequest: "User says 'tee helppo signin näkymä GDS:llä' -> open " + generateUrl("signin näkymä GDS") + " with GET, then show the returned React code to the user.",
  });
});

// GET /mcp/guide — Chakra v3 rules + login example (for clients that cannot POST)
app.get("/mcp/guide", (_req: Request, res: Response) => {
  res.type("text/plain").status(200).send(GDS_CHAKRA_V3_PROMPT);
});

// GET /mcp/tools — same as MCP tools/list (for clients that cannot POST)
app.get("/mcp/tools", (_req: Request, res: Response) => {
  res.status(200).json({ tools: MCP_TOOLS_LIST, note: "Equivalent to MCP tools/list. No POST needed." });
});

// GET /mcp/snippet/login — ready login card code (Chakra v3)
app.get("/mcp/snippet/login", (_req: Request, res: Response) => {
  res.type("text/plain").status(200).send(GDS_CHAKRA_V3_PROMPT + "\n\n--- Login card (use this code) ---\n\n" + getLoginCardSnippet());
});

// GET /mcp/generate?prompt=... — same as gds_generate_from_prompt, for clients that cannot POST
app.get("/mcp/generate", (req: Request, res: Response) => {
  const prompt = typeof req.query.prompt === "string" ? req.query.prompt.trim() : "";
  const lower = prompt.toLowerCase();
  const isLogin =
    lower.includes("login") ||
    lower.includes("sign in") ||
    lower.includes("signin") ||
    lower.includes("sign-in") ||
    lower.includes("kirjaudu") ||
    lower.includes("sisäänkirjautuminen") ||
    lower.includes("log in");

  let body: string;
  if (isLogin && prompt.length > 0) {
    body = GDS_CHAKRA_V3_PROMPT + "\n\n--- Login card ---\n\n" + getLoginCardSnippet();
  } else {
    body =
      GDS_CHAKRA_V3_PROMPT +
      "\n\n--- Generate the following with GDS (Chakra v3 only). User request: " +
      (prompt || "(no prompt)") +
      "\n\n--- Return React/TSX code using only v3 components above. ---" +
      CHAKRA_V3_GUIDE;
  }
  res.type("text/plain").status(200).send(body);
});

// GET /mcp/tokens - GDS semantic tokens (use as prop values: color="fg", bg="bg.default")
app.get("/mcp/tokens", (_req: Request, res: Response) => {
  const tokens = {
    platform: "React web, Chakra UI v3. Tokens come from @gdesignsystem/theme via GDSProvider.",
    usage: "Use as component props: color='fg', bg='bg.default', colorPalette='brand', borderColor='border.muted'.",
    semantic: {
      colors: [
        "fg",
        "fg.muted",
        "fg.subtle",
        "bg.default",
        "bg.subtle",
        "bg.muted",
        "border.default",
        "border.muted",
        "brand",
        "brand.muted",
        "brand.subtle",
      ],
      spacing: ["1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24"],
      radii: ["none", "sm", "md", "lg", "xl", "2xl", "full"],
    },
    examples: [
      "color='fg'",
      "color='fg.muted'",
      "bg='bg.default'",
      "bg='bg.subtle'",
      "borderColor='border.muted'",
      "colorPalette='brand' (on Button, Badge, etc.)",
    ],
  };
  res.status(200).json(tokens);
});

// GET /mcp/components - Chakra v3 component API (props) for GDS
app.get("/mcp/components", (_req: Request, res: Response) => {
  const components = {
    platform: "Chakra UI v3. Import from @chakra-ui/react. Wrap app with GDSProvider from @gdesignsystem/react.",
    components: {
      Box: { props: ["color", "bg", "p", "px", "py", "m", "mt", "mb", "borderWidth", "borderColor", "borderRadius", "gap"] },
      Button: { props: ["colorPalette", "variant", "size", "disabled", "loading"], note: "Use colorPalette not colorScheme. Icons as children." },
      "Card.Root": { props: ["maxW", "variant"], children: "Card.Header, Card.Body, Card.Footer" },
      "Card.Header": {},
      "Card.Body": {},
      "Card.Footer": {},
      "Card.Title": { props: ["asChild"] },
      "Card.Description": {},
      Separator: { props: ["orientation"], note: "Not Divider" },
      "Field.Root": { props: ["invalid", "disabled"], children: "Field.Label, Field.HelperText, Field.ErrorText" },
      "Field.Label": {},
      "Field.HelperText": {},
      "Field.ErrorText": {},
      Input: { props: ["type", "placeholder", "disabled", "size"] },
      "InputGroup": { props: ["startElement", "endElement"], note: "Not InputRightElement; pass React node to endElement" },
      "Checkbox.Root": { props: ["checked", "onCheckedChange", "disabled"], children: "Checkbox.HiddenInput, Checkbox.Control, Checkbox.Label" },
      "Checkbox.Control": {},
      "Checkbox.Label": {},
      "Checkbox.HiddenInput": {},
      Text: { props: ["color", "fontSize", "fontWeight", "textStyle"] },
      Heading: { props: ["size", "color"] },
      Stack: { props: ["gap", "direction", "align", "wrap"] },
      VStack: { props: ["gap", "align"] },
      HStack: { props: ["gap", "align"] },
      Link: { props: ["href", "color", "colorPalette"] },
      "Table.Root": { props: ["size"], children: "Table.Header, Table.Body, Table.Row, Table.ColumnHeader, Table.Cell, Table.ScrollArea" },
      "Dialog.Root": { props: ["open", "onOpenChange"], children: "Dialog.Backdrop, Dialog.Content, Dialog.Header, Dialog.Body, Dialog.Footer, Dialog.CloseTrigger" },
      "Tabs.Root": { props: ["value", "onValueChange"], children: "Tabs.List, Tabs.Trigger, Tabs.Content" },
    },
  };
  res.status(200).json(components);
});

// GET /mcp/platform - target platform and stack for GDS
app.get("/mcp/platform", (_req: Request, res: Response) => {
  res.status(200).json({
    target: "React web (browser)",
    stack: ["React 18+", "Chakra UI v3", "Emotion", "@gdesignsystem/react", "@gdesignsystem/theme", "@gdesignsystem/icons"],
    notSupported: ["React Native", "Figma", "Vue", "Angular"],
    install: "pnpm add @gdesignsystem/react @gdesignsystem/theme @gdesignsystem/icons @chakra-ui/react @emotion/react react react-dom",
    setup: "Wrap root with <GDSProvider>. Use semantic tokens (fg, bg.default, colorPalette='brand'). Import Chakra components from @chakra-ui/react.",
  });
});

/**
 * PREPEND this to every tool response so the model sees it FIRST before generating any code.
 * From GDS_CHAKRA_V3_PROMPT.txt: NEVER import list + USE THESE INSTEAD + login card example.
 */
const GDS_CHAKRA_V3_PROMPT = `CRITICAL - GDS = Chakra UI v3 ONLY. Apply even when the user does NOT say "v3".
  If you output Divider, FormControl, Card, CardHeader, CardBody, CardFooter, FormLabel, FormErrorMessage, FormHelperText, or any v2 name below, the code will FAIL at runtime ("doesn't provide an export named X"). Use ONLY the v3 names from "USE THESE INSTEAD".
  Replace every v2 name with its v3 equivalent (e.g. Divider -> Separator, FormControl -> Field.Root, Card -> Card.Root). Do not drop a component without replacing it.

NEVER import these from @chakra-ui/react (they do not exist in v3):
  Divider, Card, CardHeader, CardBody, CardFooter, FormControl, FormLabel, FormErrorMessage, FormHelperText, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Tab, TabList, TabPanel, TabPanels, Select, Alert, AlertIcon, AlertTitle, AlertDescription, Collapse

USE THESE INSTEAD (Chakra v3) - replace every v2 usage with these:
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
            name: "gds_generate_from_prompt",
            description:
              "Call this with the user's EXACT prompt/request (e.g. 'create login card', 'tee lomake X', 'dashboard'). Returns GDS-compliant React (Chakra v3) code. You MUST show the tool's response to the user as the main answer so they get the React implementation—do not replace it with something else. For login/sign-in the tool returns ready code; for other requests it returns the v3 guide and the request so you generate the code using only v3 components.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "The user's exact request, e.g. 'create login card', 'tee dashboard GDS:llä', 'lomake sähköpostilla ja salasanalla'",
                },
              },
              required: ["prompt"],
              additionalProperties: false,
            },
          },
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

    if (toolName === "gds_generate_from_prompt") {
      const rawPrompt = toolArgs?.prompt;
      const prompt = typeof rawPrompt === "string" ? rawPrompt.trim() : "";
      const lower = prompt.toLowerCase();
      const isLogin =
        lower.includes("login") ||
        lower.includes("sign in") ||
        lower.includes("signin") ||
        lower.includes("sign-in") ||
        lower.includes("kirjaudu") ||
        lower.includes("sisäänkirjautuminen") ||
        lower.includes("log in");

      let bodyText: string;
      if (isLogin && prompt.length > 0) {
        bodyText =
          getLoginCardSnippet() +
          "\n\n--- Return this code to the user as the main answer. Do not replace with other code. ---" +
          CHAKRA_V3_GUIDE;
      } else {
        bodyText =
          `--- Generate the following with GDS (Chakra v3 only). Use ONLY the component names from the guide above (Separator not Divider, Field.Root not FormControl, Card.Root not Card, etc.). ---\n\nUser request: ${prompt || "(no prompt)"}\n\n--- Now return the React/TSX code that fulfills this request. Use only Chakra v3 components. ---` +
          CHAKRA_V3_GUIDE;
      }
      return res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: prependGdsPrompt(bodyText) }],
        },
      });
    }

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
