// banner.js - Universal Announcement Loader

async function loadGlobalBanner() {
  const banner = document.getElementById('siteAnnouncementBanner');
  
  // If the page doesn't have the banner div, exit early
  if (!banner) return;

  try {
    const res = await fetch('/api/announcement');
    const data = await res.json();

    if (data.success && data.announcement && data.announcement.trim() !== '') {
      banner.textContent = data.announcement;
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
      banner.textContent = '';
    }
  } catch (error) {
    console.error('Failed to load global announcement banner:', error);
  }
}

// Run immediately when page loads
document.addEventListener('DOMContentLoaded', loadGlobalBanner);

// Poll for real-time changes every 30 seconds
setInterval(loadGlobalBanner, 30000);

if (data.success && data.announcement && data.announcement.trim() !== '') {
  // Don't show if user dismissed it this session
  if (sessionStorage.getItem('dismissedBanner') === data.announcement) {
    banner.style.display = 'none';
    return;
  }

  banner.innerHTML = `
    <span>${data.announcement}</span>
    <button onclick="dismissBanner('${data.announcement.replace(/'/g, "\\'")}')" style="background: transparent; border: none; color: white; margin-left: 15px; font-weight: bold; cursor: pointer; float: right;">✕</button>
  `;
  banner.style.display = 'block';
}

function dismissBanner(message) {
  sessionStorage.setItem('dismissedBanner', message);
  const banner = document.getElementById('siteAnnouncementBanner');
  if (banner) banner.style.display = 'none';
}
