import { axe } from 'jest-axe';

export const runAxe = async (
  element: HTMLElement,
  options?: Record<string, unknown>
): Promise<any> => {
  return axe(element, options);
};
