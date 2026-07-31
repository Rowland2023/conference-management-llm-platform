export default {
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**/*.js",
        "!src/index.js",
    ],
};