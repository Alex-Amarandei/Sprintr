import { Card, Container, Group, Skeleton, SimpleGrid, Stack } from "@mantine/core";

/** Grid of shop-card placeholders — matches /browse. */
export function ShopGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Container size="lg" py="xl">
      <Skeleton height={28} width={220} mb="lg" radius="sm" />
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} p={0} withBorder>
            <Skeleton height={132} radius={0} />
            <Stack gap="xs" p="md">
              <Skeleton height={16} width="70%" radius="sm" />
              <Skeleton height={12} radius="sm" />
              <Skeleton height={12} width="40%" radius="sm" />
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}

/** A header band + content lines — for shop / order detail pages. */
export function DetailSkeleton() {
  return (
    <Container size="lg" py="xl">
      <Skeleton height={160} radius="lg" mb="xl" />
      <Group align="flex-start" gap="xl" wrap="wrap">
        <Stack gap="md" style={{ flex: 1, minWidth: 280 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} withBorder>
              <Skeleton height={18} width="50%" mb="sm" radius="sm" />
              <Skeleton height={12} mb={6} radius="sm" />
              <Skeleton height={12} width="80%" radius="sm" />
            </Card>
          ))}
        </Stack>
        <Skeleton height={260} w={300} radius="lg" visibleFrom="md" />
      </Group>
    </Container>
  );
}

/** Stacked rows — for order lists / dashboard tables. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Container size="lg" py="xl">
      <Skeleton height={28} width={200} mb="lg" radius="sm" />
      <Stack gap="sm">
        {Array.from({ length: rows }).map((_, i) => (
          <Card key={i} withBorder>
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={8} style={{ flex: 1 }}>
                <Skeleton height={16} width="40%" radius="sm" />
                <Skeleton height={12} width="65%" radius="sm" />
              </Stack>
              <Skeleton height={28} width={90} radius="xl" />
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
