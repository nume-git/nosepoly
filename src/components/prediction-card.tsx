import { Badge, Button, Card, Flex, Group, Input, Stack, Status, Text } from "@chakra-ui/react";
import { Form } from "@/components/form";
import { castRatingVoteAction, castValidationVoteAction } from "@/server/actions";
import type { Dot, PredictionCard as CardView } from "@/domain/views";

const DOT_PALETTE: Record<Dot, string> = {
  neutral: "gray",
  primary: "blue",
  warning: "orange",
  success: "green",
  error: "red",
};

const VOTE_FORM = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "3",
  borderTopWidth: "1px",
  pt: "3",
} as const;

export function PredictionCard({ card, nested = false }: { card: CardView; nested?: boolean }) {
  return (
    <Card.Root
      as="article"
      id={`prediction-${card.id}`}
      variant={nested ? "subtle" : "outline"}
      bg={nested ? "bg.muted" : "bg.panel"}
    >
      <Card.Body gap="3" p="5">
        <Stack gap="1">
          <Text id={`prediction-${card.id}-text`} textStyle="lg" fontWeight="semibold" lineHeight="snug">
            {card.text}
          </Text>
          <Flex id={`prediction-${card.id}-status`} align="center" gap="2" textStyle="sm" color="fg.muted">
            <Status.Root colorPalette={DOT_PALETTE[card.dot]} size="sm">
              <Status.Indicator aria-hidden />
            </Status.Root>
            {card.helper}
            {card.authorAlias && (
              <Badge size="sm" variant="outline">
                {card.authorAlias}
              </Badge>
            )}
          </Flex>
        </Stack>

        {card.canVoteRating && (
          <Form id={`prediction-${card.id}-rating`} action={castRatingVoteAction} {...VOTE_FORM}>
            <Input type="hidden" name="predictionId" value={card.id} />
            <Text fontWeight="semibold">¿Cuánto vale?</Text>
            <Group attached role="group" aria-label="Valor de la predicción">
              {[1, 2, 3].map((value) => {
                const selected = card.myRatingVote === value;
                return (
                  <Button
                    key={value}
                    type="submit"
                    id={`prediction-${card.id}-rate-${value}`}
                    name="value"
                    value={value}
                    aria-pressed={selected}
                    w="14"
                    variant={selected ? "solid" : "outline"}
                    colorPalette={selected ? "blue" : "gray"}
                  >
                    {value}
                  </Button>
                );
              })}
            </Group>
          </Form>
        )}

        {card.canVoteValidation && (
          <Form id={`prediction-${card.id}-validation`} action={castValidationVoteAction} {...VOTE_FORM}>
            <Input type="hidden" name="predictionId" value={card.id} />
            {/* Llenos hasta votar; después queda lleno solo el elegido. */}
            <Button
              type="submit"
              id={`prediction-${card.id}-fulfilled-yes`}
              name="fulfilled"
              value="true"
              aria-pressed={card.myValidationVote === true}
              variant={card.myValidationVote === false ? "outline" : "solid"}
              colorPalette="green"
            >
              Se cumplió
            </Button>
            <Button
              type="submit"
              id={`prediction-${card.id}-fulfilled-no`}
              name="fulfilled"
              value="false"
              aria-pressed={card.myValidationVote === false}
              variant={card.myValidationVote === true ? "outline" : "solid"}
              colorPalette="red"
            >
              No se cumplió
            </Button>
          </Form>
        )}
      </Card.Body>
    </Card.Root>
  );
}
