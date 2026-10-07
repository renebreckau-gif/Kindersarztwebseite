import "@/design-system/tokens.css";
import "@/design-system/base.css";

export default function SignatureLayout({ children }: { children: React.ReactNode }) {
  return <div className="ds-root">{children}</div>;
}
