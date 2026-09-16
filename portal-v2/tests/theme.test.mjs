import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeThemeSettings } from '../lib/theme.js';

test('dark mode always uses pure black background',()=>{
  const x=normalizeThemeSettings({theme_mode:'dark'});
  assert.equal(x.background,'#000000');
});

test('invalid accent falls back to default',()=>{
  const x=normalizeThemeSettings({accent:'javascript:alert(1)'});
  assert.equal(x.accent,'#0A84FF');
});

test('glass settings are clamped to safe ranges',()=>{
  const x=normalizeThemeSettings({glass_opacity:4,glass_blur:400,radius:99,motion_speed:5,spring_strength:0});
  assert.equal(x.glass_opacity,0.92);
  assert.equal(x.glass_blur,48);
  assert.equal(x.radius,34);
  assert.equal(x.motion_speed,1.6);
  assert.equal(x.spring_strength,0.6);
});
