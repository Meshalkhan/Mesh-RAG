import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import type { Feature } from "@/types/feature";

const features: Feature[] = [];

export function FeatureCards() {
  return (
    <section id="features" className="border-t border-border/60 py-16 sm:py-20">
      <Container className="space-y-10">
        <div className="max-w-xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Capabilities
          </h2>
          <p className="text-muted-foreground">
            Core building blocks for grounded document intelligence.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full bg-card/60">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
