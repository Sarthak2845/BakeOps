export function getParam(params: Record<string, string | string[] | undefined>, name: string): string {
  const value = params[name];
  return Array.isArray(value) ? value[0] : (value ?? "");
}
