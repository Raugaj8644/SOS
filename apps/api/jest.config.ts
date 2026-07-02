import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir:              '.',
  testRegex:            'test/.*\\.spec\\.ts$',
  transform:            { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom:  ['src/**/*.(t|j)s', '!src/**/*.module.ts', '!src/main.ts'],
  coverageDirectory:    './coverage',
  testEnvironment:      'node',
  moduleNameMapper: {
    '^@cerp/shared$': '<rootDir>/../../packages/shared/src/index',
  },
};

export default config;
