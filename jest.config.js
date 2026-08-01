export default {
    testEnvironment: "node",

    roots: [
        "<rootDir>/src"
    ],

    collectCoverage: true,

    collectCoverageFrom: [
        "src/**/*.js",
        "!src/index.js",
    ],
};