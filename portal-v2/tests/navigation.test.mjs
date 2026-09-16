import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoleDestinations,isDestinationAllowed,primaryDestinations } from '../lib/navigation.js';

test('primary dock contains exactly five destinations',()=>{
  assert.deepEqual(primaryDestinations.map(x=>x.key),['home','study','chat','notifications','more']);
});

test('student never sees admin areas',()=>{
  const keys=buildRoleDestinations('STUDENT').map(x=>x.key);
  assert.equal(keys.includes('admin'),false);
  assert.equal(keys.includes('superadmin'),false);
});

test('admin sees admin workspace but not super admin control center',()=>{
  const keys=buildRoleDestinations('ADMIN').map(x=>x.key);
  assert.equal(keys.includes('admin'),true);
  assert.equal(keys.includes('admin-requests'),true);
  assert.equal(keys.includes('superadmin'),false);
});

test('super admin sees all privileged destinations',()=>{
  const keys=buildRoleDestinations('SUPER_ADMIN').map(x=>x.key);
  assert.equal(keys.includes('admin'),true);
  assert.equal(keys.includes('superadmin'),true);
  assert.equal(isDestinationAllowed('superadmin','SUPER_ADMIN'),true);
});
