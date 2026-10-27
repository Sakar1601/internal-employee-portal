import { isDemo } from "./api";

// The static demo hosts the whole project site, so the employee portal lives under /portal there.
// In the real build the portal owns the root, exactly as the backend serves it.
const PORTAL = isDemo ? "/portal" : "";

export const paths = {
  login: `${PORTAL}/login`,
  home: PORTAL || "/",
  activity: `${PORTAL}/activity`,
};
