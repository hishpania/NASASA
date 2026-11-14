import { Subheading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import clsx from "clsx";
import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
};

export function ChartCard({
  title,
  description,
  className,
  children,
}: ChartCardProps) {
  return (
    <section
      className={clsx(
        "rounded-xl bg-white p-6 ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10",
        className,
      )}
    >
      <Subheading>{title}</Subheading>
      <Text className="mt-1">{description}</Text>
      <div className="mt-6 h-72">{children}</div>
    </section>
  );
}
