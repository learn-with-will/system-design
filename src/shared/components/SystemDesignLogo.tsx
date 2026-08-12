/**
 * The course mark: a small network of connected nodes — a central hub linked to
 * three peers, evoking a distributed system's topology. Rendered in the course's
 * teal (#0d9488). Callers control size and hover via `className`; the brand color
 * is fixed so the logo looks consistent in both light and dark themes.
 */
export function SystemDesignLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M12 12 12 4M12 12 5 17.5M12 12 19 17.5M12 4 5 17.5M5 17.5 19 17.5M19 17.5 12 4"
        fill="none"
        stroke="#0d9488"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#0d9488">
        <circle cx="12" cy="4" r="2.1" />
        <circle cx="5" cy="17.5" r="2.1" />
        <circle cx="19" cy="17.5" r="2.1" />
        <circle cx="12" cy="12" r="2.5" />
      </g>
    </svg>
  );
}
