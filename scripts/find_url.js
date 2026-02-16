const USER_AGENT =
  "Monazilla/1.00 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

const keyword = process.argv[2];

if (!keyword) {
  console.error("使い方: node find_url.js <検索ワード>");
  process.exit(1);
}

const url = `https://find.5ch.net/search?q=${encodeURIComponent(keyword)}`;

let html;
try {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    console.error(`エラー: HTTP ${res.status}`);
    process.exit(1);
  }

  html = await res.text();
} catch (err) {
  console.error(`エラー: ${err.message}`);
  process.exit(1);
}

const pattern =
  /href="(https?:\/\/[^"]+\/test\/read\.cgi\/[^"]+)"[^>]*>\s*<div[^>]*class="list_line_link_title"[^>]*>([^<]+)<\/div>\s*<\/a>\s*<div[^>]*class="list_line_info"[^>]*>\s*<div[^>]*class="list_line_info_container list_line_info_container-board"[^>]*><a[^>]*>([^<]+)<\/a><\/div>\s*<div[^>]*class="list_line_info_container"[^>]*>([^<]+)<\/div>/g;

const results = [];
let match;
while ((match = pattern.exec(html)) !== null) {
  results.push({
    url: match[1],
    title: match[2].trim(),
    board: match[3].trim(),
    date: match[4].trim(),
  });
}

if (results.length === 0) {
  console.log("検索結果が見つかりませんでした。");
  process.exit(0);
}

results.reverse().forEach((r, i) => {
  console.log(`${results.length - i}. ${r.title}`);
  console.log(`   ${r.board} / ${r.date}`);
  console.log(`   ${r.url}`);
});
