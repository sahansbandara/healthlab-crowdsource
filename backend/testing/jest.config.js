module.exports = {
  testEnvironment: "node",
  testTimeout: 30000,
  clearMocks: true,
  roots: ["<rootDir>/unit", "<rootDir>/integration"],
  collectCoverageFrom: [
    "../src/services/experimentService.js",
    "../src/services/eligibilityService.js",
    "../src/services/recommendationService.js",
    "../src/validators/experimentValidators.js",
    "../src/utils/passwordPolicy.js",
    "../src/controllers/participationController.js",
    "../src/modules/community/**/*.js",
    "../src/controllers/adminController.js",
    "../src/services/analyticsService.js",
    "!../src/**/config/**",
  ],
};
