import {
  AppUpdateError,
  describeUpdateError,
  technicalMessage,
} from '../src/features/settings/updateErrors';
import { hasNewVersion } from '../src/features/settings/updateService';

describe('APP updater', () => {
  it('compares semantic version components', () => {
    expect(hasNewVersion('v1.0.5')).toBe(true);
    expect(hasNewVersion('v1.0.4')).toBe(false);
    expect(hasNewVersion('v1.0.2')).toBe(false);
  });

  it('keeps a stable download error code and guidance', () => {
    const details = describeUpdateError(
      new AppUpdateError('UPD-202', 'download interrupted'),
    );

    expect(details).toMatchObject({
      code: 'UPD-202',
      title: '下載連線中斷',
      technical: 'download interrupted',
    });
    expect(details.suggestion).toContain('網路');
  });

  it('redacts signed URLs from technical diagnostics', () => {
    expect(
      technicalMessage(
        'failed https://release-assets.githubusercontent.com/file?token=secret',
      ),
    ).toBe('failed [URL]');
  });

  it('maps unknown native errors to UPD-999', () => {
    expect(describeUpdateError(new Error('native failure'))).toMatchObject({
      code: 'UPD-999',
      technical: 'native failure',
    });
  });
});
