import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger';

describe('EnterpriseLogger unit tests', () => {
  it('logs info, warn, error, and debug without crashing', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    logger.info('Repository', 'Test info message');
    logger.warn('Customer', 'Test warning message');
    logger.error('Invoice', 'Test error message', new Error('Fail'));
    logger.debug('Production', 'Test debug message');

    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
