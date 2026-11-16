// Functional pictograms only (no medical/cute icon library).
// 24-unit grid, 1.6 stroke, round caps and joins, drawn at 20–22 px.

export type IconName = "phone" | "today" | "alert" | "menu" | "close" | "route" | "back" | "mail" | "calendar" | "info" | "card" | "booklet" | "mask";

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };
  switch (name) {
    case "phone":
      return (
        <svg {...p}>
          <path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "today":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "alert":
      return (
        <svg {...p}>
          <path d="M12 3.5 21 19.5H3Z" />
          <path d="M12 10v4.2M12 17.1v.1" />
        </svg>
      );
    case "mail":
      return (
        <svg {...p}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
        </svg>
      );
    case "info":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5.2M12 7.9v.1" />
        </svg>
      );
    case "menu":
      return (
        <svg {...p}>
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
    case "close":
      return (
        <svg {...p}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "route":
      return (
        <svg {...p}>
          <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11Z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      );
    case "back":
      return (
        <svg {...p}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
    // Gut vorbereitet (10.1B): neutral objects, no medical symbolism.
    case "card":
      return (
        <svg {...p}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M3.5 10h17M7 14.5h4" />
        </svg>
      );
    case "booklet":
      return (
        <svg {...p}>
          <path d="M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z" />
          <path d="M8.5 3.5v17M12 8.5h4M12 11.5h4" />
        </svg>
      );
    case "mask":
      return (
        <svg {...p}>
          <path d="M7 7.5h10a1.5 1.5 0 0 1 1.5 1.5v3.5c0 2.8-2.9 5-6.5 5s-6.5-2.2-6.5-5V9A1.5 1.5 0 0 1 7 7.5Z" />
          <path d="M5.5 9.5H4a1.5 1.5 0 0 0 0 3h1.7M18.5 9.5H20a1.5 1.5 0 0 1 0 3h-1.7M9 10.5h6M9 13h6" />
        </svg>
      );
  }
}
