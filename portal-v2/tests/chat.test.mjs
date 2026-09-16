import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMessageBody } from '../lib/chat.js';

test('blank messages are rejected',()=>assert.equal(normalizeMessageBody('   '),null));
test('messages are trimmed before sending',()=>assert.equal(normalizeMessageBody('  привет  '),'привет'));
