export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} environment variable is required for integration tests. ` +
        `Set it in .env or export it.`,
    )
  }
  return value
}
