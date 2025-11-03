/**
 * Company fixtures - predefined company data for tests
 */

export const testCompanies = {
  acmeCorp: {
    name: 'Acme Corporation',
    domain: 'acme.com',
    slug: 'acme-corp',
  },
  techStartup: {
    name: 'Tech Startup Inc',
    domain: 'techstartup.com',
    slug: 'tech-startup',
  },
  designAgency: {
    name: 'Creative Design Agency',
    domain: 'designagency.com',
    slug: 'design-agency',
  },
};

/**
 * Get a test company by key
 */
export function getTestCompany(key: keyof typeof testCompanies) {
  return testCompanies[key];
}

/**
 * Get all test companies
 */
export function getAllTestCompanies() {
  return Object.values(testCompanies);
}
