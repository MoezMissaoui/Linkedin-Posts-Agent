// Re-mounts on each navigation inside the auth segment so the entry animation
// plays when the user moves between login / register / forgot-password.
export default function AuthTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="animate-page-in">{children}</div>;
}
