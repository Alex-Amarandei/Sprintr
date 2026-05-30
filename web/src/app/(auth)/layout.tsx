import { Box, Center, Container } from "@mantine/core";
import { LinkAnchor } from "@/components/ui/links";
import { Wordmark } from "@/components/ui/Wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box mih="100vh" bg="brand.0">
      <Box p="lg">
        <LinkAnchor href="/" fw={700} fz="xl" c="brand.6" underline="never">
          <Wordmark />
        </LinkAnchor>
      </Box>
      <Center px="md" py={48}>
        <Container size={420} w="100%">
          {children}
        </Container>
      </Center>
    </Box>
  );
}
