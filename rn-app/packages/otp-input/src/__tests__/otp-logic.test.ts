import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyBackspace, applyInput, isComplete, sanitize, toCells } from '../otp-logic';

const empty = (length = 6) => toCells('', length);

describe('applyInput', () => {
  it('fills the cell and advances focus', () => {
    assert.deepEqual(applyInput(empty(4), 0, '7', 'numeric'), { cells: ['7', '', '', ''], focusIndex: 1 });
  });

  it('keeps focus on the last cell when it is filled', () => {
    assert.deepEqual(applyInput(['1', '2', '3', ''], 3, '4', 'numeric'), { cells: ['1', '2', '3', '4'], focusIndex: 3 });
  });

  it('carries a keystroke that outran the focus change into the next cell', () => {
    assert.deepEqual(applyInput(['1', '', '', ''], 0, '19', 'numeric'), { cells: ['1', '9', '', ''], focusIndex: 2 });
  });

  it('distributes a pasted full code from the first cell, whichever cell received it', () => {
    assert.deepEqual(applyInput(empty(6), 3, '123456', 'numeric'), { cells: ['1', '2', '3', '4', '5', '6'], focusIndex: 5 });
  });

  it('distributes a partial paste from the focused cell', () => {
    assert.deepEqual(applyInput(empty(6), 2, '12', 'numeric'), { cells: ['', '', '1', '2', '', ''], focusIndex: 4 });
  });

  it('strips separators and invalid characters from pasted text', () => {
    assert.deepEqual(applyInput(empty(6), 0, '123-456', 'numeric').cells, ['1', '2', '3', '4', '5', '6']);
    assert.deepEqual(applyInput(empty(4), 0, 'a', 'numeric'), { cells: ['', '', '', ''], focusIndex: null });
  });

  it('truncates pastes longer than the code', () => {
    assert.deepEqual(applyInput(empty(4), 0, '1234567', 'numeric').cells, ['1', '2', '3', '4']);
  });

  it('respects the configured character set', () => {
    assert.deepEqual(sanitize('A1b2', 'alpha'), ['A', 'b']);
    assert.deepEqual(sanitize('A1b2', 'alphanumeric'), ['A', '1', 'b', '2']);
  });

  it('clears the cell when the text is deleted', () => {
    assert.deepEqual(applyInput(['1', '2', '', ''], 1, '', 'numeric'), { cells: ['1', '', '', ''], focusIndex: null });
  });
});

describe('applyBackspace', () => {
  it('moves back and clears the previous cell when the current one is empty', () => {
    assert.deepEqual(applyBackspace(['1', '2', '', ''], 2), { cells: ['1', '', '', ''], focusIndex: 1 });
  });

  it('does nothing extra when the current cell still has a value', () => {
    assert.deepEqual(applyBackspace(['1', '2', '', ''], 1), { cells: ['1', '2', '', ''], focusIndex: null });
  });

  it('stays on the first cell', () => {
    assert.deepEqual(applyBackspace(['', '', '', ''], 0).focusIndex, null);
  });
});

describe('isComplete', () => {
  it('is true only when every cell is filled', () => {
    assert.equal(isComplete(['1', '2', '3', '4']), true);
    assert.equal(isComplete(['1', '', '3', '4']), false);
  });
});
