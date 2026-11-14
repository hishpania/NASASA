import clsx from "clsx";

type SegmentedControlProps<T extends string | number> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-lg bg-zinc-950/5 p-1 dark:bg-white/5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm/6 font-medium transition",
            option.value === value
              ? "bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-700 dark:text-white dark:ring-white/10"
              : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
