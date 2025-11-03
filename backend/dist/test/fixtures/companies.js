"use strict";
/**
 * Company fixtures - predefined company data for tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCompanies = void 0;
exports.getTestCompany = getTestCompany;
exports.getAllTestCompanies = getAllTestCompanies;
exports.testCompanies = {
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
function getTestCompany(key) {
    return exports.testCompanies[key];
}
/**
 * Get all test companies
 */
function getAllTestCompanies() {
    return Object.values(exports.testCompanies);
}
