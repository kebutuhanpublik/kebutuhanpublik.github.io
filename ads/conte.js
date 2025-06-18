const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQoqUMApbGKBfLJOIE1jztwA5bOsiQuCx5LzexE8ip7jJK_Ue6Kkx7bqTOu8jLKUlw0sc6-zLg2kOmA/pub?gid=0&single=true&output=csv';

function parseCSV(text) {
  const rows = text.trim().split('\n').map(row => row.split(','));
  const headers = rows.shift().map(h => h.trim());
  return rows.map(row => {
    let obj = {};
    row.forEach((value, index) => {
      obj[headers[index]] = value.trim();
    });
    return obj;
  });
}

function getDayLabel(dateStr) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function normalizeTime(jam) {
  const parts = jam.split(':');
  return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
}

function base64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function filterByDateAndTime(data) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return data.filter(item => {
    const [year, month, day] = item.tanggal.split('-');
    const [hour, minute] = normalizeTime(item.jam).split(':');

    const matchDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());

    const isTodayOrTomorrow = matchDay.getTime() === today.getTime() || matchDay.getTime() === tomorrow.getTime();
    const matchEndTime = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000); // +2 jam

    return isTodayOrTomorrow && now <= matchEndTime;
  });
}

function generateHTML(data) {
  const grouped = {};

  data.forEach(item => {
    const key = item.liga + '|' + item.tanggal;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  let html = '';

  for (const key in grouped) {
    const [liga, tanggal] = key.split('|');
    const label = `${liga} – ${getDayLabel(tanggal)}`;

    html += `<div class="match-block">
      <div class="league-header">🏆 ${label}</div>`;

    grouped[key].forEach(item => {
      const homeLogo = item.logoHome || 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
      const awayLogo = item.logoAway || 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
      const time = normalizeTime(item.jam);
      
      const streamingUrl = `https://player.rosieworld.net/detail.html?v=1745381716708&mid=${item.linkStreaming}&type=1&pid=3&isTips=1&isLogin=0&sbtcolor=27c5c3&pfont=65px&host=dszb3.com&isStandalone=true`;
      const encodedUrl = base64Encode(streamingUrl);

      const link = `https://kebutuhanpublik.github.io/stream.html?url+${encodedUrl}`;

      html += `
        <a href="${link}" class="match-card elementskit_button" target="_blank" rel="noopener">
          <div class="team-column">
            <div class="team-row">
              <img data-src="${homeLogo}" alt="${item.homeTeam}" class="team-logo" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" loading="lazy">
              <span class="team-name">${item.homeTeam}</span>
            </div>
            <div class="team-row">
              <img data-src="${awayLogo}" alt="${item.awayTeam}" class="team-logo" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" loading="lazy">
              <span class="team-name">${item.awayTeam}</span>
            </div>
          </div>
          <div class="match-time">
            <div>${time}</div>
            <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M10 16.5L16 12L10 7.5V16.5ZM21 3H3C1.89 3 1 3.89 1 5V17C1 18.11 1.89 19 3 19H8V21H16V19H21C22.11 19 23 18.11 23 17V5C23 3.89 22.11 3 21 3ZM21 17H3V5H21V17Z"/>
            </svg>
          </div>
        </a>`;
    });

    html += '</div>';
  }

  return html || `<div style="text-align:center;padding:20px;">Tidak ada pertandingan tersedia.</div>`;
}

function lazyLoadImages() {
  const imgs = document.querySelectorAll('img.team-logo');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.getAttribute('data-src');
          if (src) {
            img.setAttribute('src', src);
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '0px 0px 100px 0px',
      threshold: 0.1
    });

    imgs.forEach(img => {
      if (img.hasAttribute('data-src')) {
        observer.observe(img);
      }
    });
  } else {
    // Fallback untuk browser lama
    imgs.forEach(img => {
      const src = img.getAttribute('data-src');
      if (src) {
        img.setAttribute('src', src);
        img.removeAttribute('data-src');
      }
    });
  }
}


let allData = [];

function renderFilteredData(filter = '') {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const matchesToday = [];
  const matchesTomorrow = [];
  const matchesDone = [];

  allData.forEach(item => {
    const [year, month, day] = item.tanggal.split('-');
    const [hour, minute] = normalizeTime(item.jam).split(':');
    const matchDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    const matchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
    const matchEndTime = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000); // +2 jam

    const isToday = matchDay.getTime() === today.getTime();
    const isTomorrow = matchDay.getTime() === tomorrow.getTime();

    let include = true;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      include = item.liga.toLowerCase().includes(lowerFilter) ||
                item.homeTeam.toLowerCase().includes(lowerFilter) ||
                item.awayTeam.toLowerCase().includes(lowerFilter) ||
                item.tanggal.toLowerCase().includes(lowerFilter);
    }

    if (include) {
      if (isToday && now <= matchEndTime) {
        matchesToday.push(item);
      } else if (isTomorrow && now <= matchEndTime) {
        matchesTomorrow.push(item);
      } else if (now > matchEndTime) {
        matchesDone.push(item);
      }
    }
  });

  let html = '';

  if (matchesToday.length > 0) {
    html += `<h2 class="day-divider">📅 Jadwal Lengkap Hari Ini</h2>` + generateHTML(matchesToday);
  }

  if (matchesTomorrow.length > 0) {
    html += `<h2 class="day-divider">📅 Jadwal Lengkap Selanjutnya</h2>` + generateHTML(matchesTomorrow);
  }

  if (matchesDone.length > 0) {
    html += `<h2 class="day-divider">✅ Pertandingan Selesai</h2>` + generateHTML(matchesDone);
  }

  document.getElementById('jadwal-pertandingan').innerHTML = html || `<div style="text-align:center;padding:20px;">Tidak ada pertandingan tersedia.</div>`;
  lazyLoadImages();
}


fetch(csvUrl)
  .then(response => response.text())
  .then(csv => {
    allData = parseCSV(csv);
    renderFilteredData();

    document.getElementById('searchInput').addEventListener('input', e => {
      renderFilteredData(e.target.value);
    });
  })
  .catch(() => {
    document.getElementById('jadwal-pertandingan').innerHTML = `<div style="text-align:center;padding:20px;">Gagal memuat data.</div>`;
  });

document.getElementById("menu-toggle").addEventListener("click", function () {
    document.getElementById("main-nav").classList.toggle("show");
  });
window.addEventListener("message", function(e) {
    if (e.origin !== "https://official.tigoals.my.id") return;
    const iframe = document.getElementById("score808frame");
    if (e.data && e.data.height) {
      iframe.style.height = e.data.height + "px";
    }
  });
function setTab(el, tabId) {
  // Toggle active class
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');

  // Toggle content
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(tabId).style.display = 'block';
}
fetch("https://idlive.falou.net/live/list")
  .then(res => res.json())
  .then(json => {
    const container = document.getElementById("live-matches");
    const list = (json?.data?.list || []);

    if (list.length === 0) {
      container.innerHTML = "<p>Tidak ada pertandingan ditemukan.</p>";
      return;
    }

    // ✅ Format play.html dengan link base64
function makeStreamLink(url, cover) {
  if (!url) return null;

  // Ganti domain lama ke domain baru
  const fixedUrl = url.replace("bf.jalaplay.net", "bf.jabflive.com");

  const playerUrl = `https://jlbfpc.jlbfyh.com/index.php?url=${encodeURIComponent(fixedUrl)}&cover=${encodeURIComponent(
    cover || 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj7i8aOEq9nbqCuQ2Dg8LIjZAaEbz9gKYVZNCiFhftNjo1UBUqrF52SruG-sHaXiPmJV6Xf4-n5Vd9vR7i8AJEKcVv5E7o-gqM3jecMC3UUvV-dF8cLzVLGG5dbifWHQnzcvhuIAdsV8tcnCLi2SqApDmr7U_Phzugv28TxPSZGqAATnhtsfIXDpoqpQf0/s1600/jalativiblogspotcom.png'
  )}&version=1&muted_btn=1&livetype=1&lang=id&web_fullscreen_tips=2&replay_download_tips=10&muted=1`;

  const encodedPlayerUrl = btoa(playerUrl);
  const finalPlayUrl = `https://kebutuhanpublik.github.io/stream.html?url+${encodedPlayerUrl}`;

  return finalPlayUrl;
}

    container.innerHTML = list.map(match => {
      const dateObj = new Date(match.match_time * 1000);
      const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const dateStr = dateObj.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    let badgeClass = "upcoming", badgeLabel = "Upcoming";
if (match.type?.includes("live")) {
  badgeClass = "live"; badgeLabel = "LIVE";
} else if ([8, 9].includes(match.status_id)) {
  badgeClass = "finished"; badgeLabel = "Selesai";
}

      const streamerList = Object.values(match.streamers || {});
      const playLinks = streamerList.map((s, index) => {
        const streamUrl = s.stream?.hd || s.stream?.szy;
        if (!streamUrl) return '';

        const coverImage = match.cover || 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj7i8aOEq9nbqCuQ2Dg8LIjZAaEbz9gKYVZNCiFhftNjo1UBUqrF52SruG-sHaXiPmJV6Xf4-n5Vd9vR7i8AJEKcVv5E7o-gqM3jecMC3UUvV-dF8cLzVLGG5dbifWHQnzcvhuIAdsV8tcnCLi2SqApDmr7U_Phzugv28TxPSZGqAATnhtsfIXDpoqpQf0/s1600/jalativiblogspotcom.png';
        const link = makeStreamLink(streamUrl, coverImage);
        return `<a href="${link}">Play ${index + 1}</a>`;
      }).join("") || `<a class="disabled">Belum tersedia</a>`;

      const htScore = match.home_half_score ?? 0;
      const awayHtScore = match.away_half_score ?? 0;
      const fullScore = `${match.home_score ?? 0} - ${match.away_score ?? 0}`;
      const streamerNames = streamerList.map(s => s.name).join(" - ") || "Tidak ada streamer";

    return `
  <div class="livecard-match">
    <div class="livecard-header">
      ${match.competition_name}
      <span class="livecard-badge ${badgeClass}">${badgeLabel}</span>
    </div>

    <div style="font-size: 0.85rem; color: var(--livecard-muted); text-align:center;">
      🕒 ${timeStr} - ${dateStr}
    </div>

    <div class="livecard-teams">
      <div class="livecard-team">
        <img src="${match.home_logo}" alt="${match.home_name}">
        <div>${match.home_name}</div>
      </div>
      <div class="livecard-vs">VS</div>
      <div class="livecard-team">
        <img src="${match.away_logo}" alt="${match.away_name}">
        <div>${match.away_name}</div>
      </div>
    </div>

    <div class="livecard-links">
      ${playLinks}
    </div>

    <div class="livecard-bottom">
      <div>🔴 ${streamerNames}</div>
    </div>
  </div>`;

    }).join("");
  })
  .catch(() => {
    document.getElementById("live-matches").innerHTML = "<p>Gagal memuat data pertandingan.</p>";
  });
