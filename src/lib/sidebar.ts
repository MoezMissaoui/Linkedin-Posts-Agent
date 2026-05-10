export const SIDEBAR_COOKIE = "postilys-sidebar";

export type SidebarState = "expanded" | "collapsed";

export function isCollapsed(value: string | undefined): boolean {
  return value === "collapsed";
}
