#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const colorMap = [
  { from: `background: '#FFFFFF'`, to: `background: 'var(--color-card)'` },
  { from: `background: '#FFF8F0'`, to: `background: 'var(--color-bg)'` },
  { from: `background: '#FFF0E8'`, to: `background: 'var(--color-bg)'` },
  { from: `background: '#F0E8E0'`, to: `background: 'var(--color-surface)'` },
  { from: `background: '#F5EFE8'`, to: `background: 'var(--color-surface)'` },
  { from: `background: '#F7F4F0'`, to: `background: 'var(--color-surface)'` },
  { from: `background: '#E8E2DC'`, to: `background: 'var(--color-surface)'` },
  { from: `color: '#9A9A9A'`, to: `color: 'var(--color-muted)'` },
  { from: `color: '#2D2D2D'`, to: `color: 'var(--color-text)'` },
  { from: `color: '#3A3A3A'`, to: `color: 'var(--color-text)'` },
  { from: `color: '#C0B8B0'`, to: `color: 'var(--color-subtle)'` },
  { from: `color: '#B0A8A0'`, to: `color: 'var(--color-subtle)'` },
  { from: `'0 2px 16px rgba(0,0,0,0.06)'`, to: `'var(--color-shadow)'` },
  { from: `"0 2px 16px rgba(0,0,0,0.06)"`, to: `"var(--color-shadow)"` },
  { from: `border: '1.5px solid #F0E8E0'`, to: `border: '1.5px solid var(--color-surface)'` },
  { from: `border: '1px solid #F0E8E0'`, to: `border: '1px solid var(--color-surface)'` },
  { from: `borderColor: '#F0E8E0'`, to: `borderColor: 'var(--color-surface)'` },
];

const files = [
  'app/page.tsx',
  'app/diary/page.tsx',
  'app/books/page.tsx',
  'app/books/add-photo/page.tsx',
  'app/diary/plan/page.tsx',
  'components/BottomNav.tsx',
  'components/BookCard.tsx',
  'components/DateLogPanel.tsx',
  'components/WeekChart.tsx',
  'components/ProgressBar.tsx',
  'components/StreakBadge.tsx',
];

const root = path.join(__dirname, '..');

files.forEach(file => {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;

  colorMap.forEach(({ from, to }) => {
    content = content.split(from).join(to);
  });

  if (content.length !== originalLength) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${file}`);
  } else {
    console.log(`- ${file} (no changes)`);
  }
});

console.log('\nDone!');
