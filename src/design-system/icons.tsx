// Functional pictograms only (no medical/cute icon library).
// 24-unit grid, 1.6 stroke, round caps and joins, drawn at 20–22 px.

export type IconName = "phone" | "today" | "alert" | "menu" | "close" | "route" | "back";

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
  }
}
