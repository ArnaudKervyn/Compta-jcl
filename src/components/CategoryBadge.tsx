import { badgeClasses, categoryAccent } from "../lib/categoryColors";

type Props = {
  name: string;
  className?: string;
};

export default function CategoryBadge({ name, className = "" }: Props) {
  const accent = categoryAccent(name);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${badgeClasses(accent)} ${className}`}>
      {name}
    </span>
  );
}

