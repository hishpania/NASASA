type SeriesLegendProps = {
  items: readonly { name: string; color: string }[];
};

export function SeriesLegend({ items }: SeriesLegendProps) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs/5 text-zinc-600 dark:text-zinc-400">
      {items.map(({ name, color }) => (
        <li key={name} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          {name}
        </li>
      ))}
    </ul>
  );
}
