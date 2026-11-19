export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Open the branded sign-in screen used by every protected NOVA action. */
export const startLogin = () => {
  window.location.assign("/signin");
};

/** Start the official Google OpenID Connect sign-in flow from the branded screen. */
export const startGoogleLogin = () => {
  window.location.assign("/api/auth/google");
};
