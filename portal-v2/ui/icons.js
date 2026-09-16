const paths={
  home:'<path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5z"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H14v18a3 3 0 0 1 3-3h.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
  chat:'<path d="M21 12a8 8 0 0 1-8 8H8l-5 2 1.7-4A8 8 0 1 1 21 12Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  grid:'<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  calendar:'<path d="M4 5h16v15H4zM8 3v4M16 3v4M4 9h16"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  megaphone:'<path d="M3 11v2l11 4V7L3 11ZM14 10l5-3v10l-5-3M6 14l1 6h4l-2-5"/>',
  board:'<path d="M4 4h16v13H4zM8 21l4-4 4 4M8 8h8M8 12h5"/>',
  chart:'<path d="M4 19h16M7 16v-5M12 16V5M17 16V9"/>',
  folder:'<path d="M3 6h7l2 2h9v11H3z"/>',
  people:'<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6 1a3 3 0 1 0 0-6M2 21a7 7 0 0 1 14 0M15 14a6 6 0 0 1 6 6"/>',
  user:'<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0"/>',
  wrench:'<path d="M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 3-3-3z"/>',
  approve:'<path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-4-10 3 3 5-6"/>',
  shield:'<path d="M12 2 4 5v6c0 5.2 3.2 9 8 11 4.8-2 8-5.8 8-11V5zM9 12l2 2 4-5"/>',
  moon:'<path d="M20 15.3A8 8 0 0 1 8.7 4a8.5 8.5 0 1 0 11.3 11.3Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
  logout:'<path d="M10 4H4v16h6M14 8l4 4-4 4M18 12H8"/>'
};
export function icon(name,{size=24,className=''}={}){return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.grid}</svg>`}
