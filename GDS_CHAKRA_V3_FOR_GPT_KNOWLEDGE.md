# GDS = Chakra UI v3 only (for Custom GPT knowledge)

Use this when the user asks for **any** UI with GDS: login card, forms, dashboard, content page, etc.  
Apply **even when the user does not say "v3"**.

---

## NEVER import these from @chakra-ui/react (they do not exist in v3; cause "doesn't provide an export named X")

`Divider`, `Card`, `CardHeader`, `CardBody`, `CardFooter`, `FormControl`, `FormLabel`, `FormErrorMessage`, `FormHelperText`, `Table`, `Thead`, `Tbody`, `Tr`, `Th`, `Td`, `TableContainer`, `Modal`, `ModalOverlay`, `ModalContent`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ModalCloseButton`, `Tab`, `TabList`, `TabPanel`, `TabPanels`, `Select`, `Alert`, `AlertIcon`, `AlertTitle`, `AlertDescription`, `Collapse`

---

## USE THESE INSTEAD (replace every v2 usage with these)

| Do NOT use (v2) | Use instead (v3) |
|-----------------|------------------|
| Divider | **Separator** |
| Card, CardHeader, CardBody, CardFooter | **Card.Root**, **Card.Header**, **Card.Body**, **Card.Footer** (and Card.Title, Card.Description) |
| FormControl, FormLabel, FormErrorMessage, FormHelperText | **Field.Root**, **Field.Label**, **Field.ErrorText**, **Field.HelperText** |
| Table, Thead, Tbody, Tr, Th, Td | **Table.Root**, **Table.Header**, **Table.Body**, **Table.Row**, **Table.ColumnHeader**, **Table.Cell** |
| Modal, ModalOverlay, ModalContent, etc. | **Dialog.Root**, **Dialog.Backdrop**, **Dialog.Content**, **Dialog.Header**, **Dialog.Body**, **Dialog.Footer**, **Dialog.CloseTrigger** |
| Tab, TabList, TabPanel, TabPanels | **Tabs.Trigger**, **Tabs.List**, **Tabs.Content** |
| colorScheme | **colorPalette** |
| isInvalid | **invalid** (on Field.Root) |
| isOpen / onClose | **open** / **onOpenChange** |
| leftIcon / rightIcon on Button | Put icon as **child**: `<Button><Icon /> Label</Button>` |

**Rule:** Replace, never drop. If you would use Divider → use Separator. If you would use FormControl → use Field.Root. If you would use Card/CardBody → use Card.Root/Card.Body.

---

## Login card example (Chakra v3)

```tsx
import * as React from "react";
import {
  Box,
  Button,
  Card,
  Field,
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
```

For any login/form card: import **Card, Field, Input, Button, Separator** (not Divider), Stack/VStack/Box/Text/Heading from @chakra-ui/react. Use **Card.Root, Card.Header, Card.Body, Card.Footer, Field.Root, Field.Label, Field.ErrorText**. Never import FormControl, FormLabel, FormErrorMessage, Divider, CardHeader, CardBody, CardFooter.
