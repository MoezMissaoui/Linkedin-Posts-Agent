// A `template.tsx` re-mounts on every navigation (unlike `layout.tsx` which
// persists). That makes the CSS entry animation replay on each page change
// inside the (app) segment, while the parent layout (sidebar, topbar) stays
// stable.
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="animate-page-in">{children}</div>;
}
