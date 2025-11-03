export const axe: (element: HTMLElement, options?: Record<string, unknown>) => Promise<any>;
export const toHaveNoViolations: {
  toHaveNoViolations(results?: any): { pass: boolean; message(): string };
};
export default axe;
