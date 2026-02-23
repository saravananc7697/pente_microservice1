import 'dotenv/config';
import type { Config } from '@jest/types';

console.log('QASE_TOKEN:', process.env.QASE_API_TOKEN);

const appName = process.env.APP_NAME || 'github-repo';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    [
      'jest-qase-reporter',
      {
        mode: 'testops',
        debug: false,
        testops: {
          api: {
            token: process.env.QASE_API_TOKEN,
          },
          project: process.env.QASE_PROJECT_CODE,
          uploadAttachments: true,
          run: {
            title: `unit-test-backend/${appName}`,
            description: 'Automated Test run triggered by Jest tests',
            complete: true,
          },
        },
      },
    ],
  ],
};

export default config;
