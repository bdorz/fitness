import {
  digitsOnly,
  formatRestDuration,
  restDurationSeconds,
  splitRestDuration,
} from '../src/features/workouts/restTimer';

describe('rest timer helpers', () => {
  it('normalizes minute and second inputs', () => {
    expect(restDurationSeconds('2', '30')).toBe(150);
    expect(restDurationSeconds('', '')).toBe(0);
    expect(restDurationSeconds('120', '90')).toBe(99 * 60 + 59);
  });

  it('splits stored seconds for editing', () => {
    expect(splitRestDuration(150)).toEqual({ minutes: '2', seconds: '30' });
    expect(splitRestDuration()).toEqual({ minutes: '', seconds: '' });
  });

  it('formats countdowns and filters numeric input', () => {
    expect(formatRestDuration(65)).toBe('01:05');
    expect(formatRestDuration(0)).toBe('00:00');
    expect(digitsOnly('1a23', 2)).toBe('12');
  });
});
