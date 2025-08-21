import { getCategoryTone, TONE_CLASSES } from "../lib/colors";

type Props = {
  name: string;
  className?: string;
  size?: "sm" | "md";
};

export default function CategoryBadge({ name, className = "", size = "sm" }: Props) {
  const tone = getCategoryTone(name);
  const toneClasses = TONE_CLASSES[tone];
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${toneClasses.badge} ${sizeClasses} ${className}`}
    >
      {name}
    </span>
  );
}

