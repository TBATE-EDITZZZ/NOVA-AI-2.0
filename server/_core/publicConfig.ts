

// Only public values may reach the browser.
// Never serialize private environment variables or API secrets.

export function publicPlatformConfig(
  env: NodeJS.ProcessEnv = process.env
) {
  return {
    projectId: env.NOVA_APP_ID ?? "nova-ai-2.0",
    apiUrl: env.NOVA_API_URL ?? "",
    apiBrowserKey: env.NOVA_API_BROWSER_KEY ?? "",
  };
}

export function publicPlatformScript(
  env: NodeJS.ProcessEnv = process.env
): string {
  const json = JSON.stringify(publicPlatformConfig(env))
    .replaceAll("<", "\\u003c");

  // Keep the existing frontend interface for compatibility.
  return `window.__MANUS_CONFIG__=${json};`;
}

