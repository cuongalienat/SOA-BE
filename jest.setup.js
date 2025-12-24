
import { jest } from '@jest/globals';
import { disableNetwork } from './src/utils/test_db' // Example if needed

global.console = {
    ...console,
    // log: jest.fn(), // Uncomment to suppress logs
    // debug: jest.fn(),
    // info: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};
