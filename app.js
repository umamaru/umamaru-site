// 47都道府県の県庁所在地座標
const PREFECTURES = [
  ["北海道", 43.06417, 141.34694], ["青森県", 40.82444, 140.74], ["岩手県", 39.70361, 141.1525],
  ["宮城県", 38.26889, 140.87194], ["秋田県", 39.71861, 140.1025], ["山形県", 38.24056, 140.36333],
  ["福島県", 37.75, 140.46778], ["茨城県", 36.34139, 140.44667], ["栃木県", 36.56583, 139.88361],
  ["群馬県", 36.39111, 139.06083], ["埼玉県", 35.85694, 139.64889], ["千葉県", 35.60472, 140.12333],
  ["東京都", 35.68944, 139.69167], ["神奈川県", 35.44778, 139.6425], ["新潟県", 37.90222, 139.02361],
  ["富山県", 36.69528, 137.21139], ["石川県", 36.59444, 136.62556], ["福井県", 36.06528, 136.22194],
  ["山梨県", 35.66389, 138.56833], ["長野県", 36.65139, 138.18111], ["岐阜県", 35.39111, 136.72222],
  ["静岡県", 34.97694, 138.38306], ["愛知県", 35.18028, 136.90667], ["三重県", 34.73028, 136.50861],
  ["滋賀県", 35.00444, 135.86833], ["京都府", 35.02139, 135.75556], ["大阪府", 34.68639, 135.52],
  ["兵庫県", 34.69139, 135.18306], ["奈良県", 34.68528, 135.83278], ["和歌山県", 34.22611, 135.1675],
  ["鳥取県", 35.50361, 134.23833], ["島根県", 35.47222, 133.05056], ["岡山県", 34.66167, 133.935],
  ["広島県", 34.39639, 132.45944], ["山口県", 34.18583, 131.47139], ["徳島県", 34.06583, 134.55944],
  ["香川県", 34.34028, 134.04333], ["愛媛県", 33.84167, 132.76611], ["高知県", 33.55972, 133.53111],
  ["福岡県", 33.60639, 130.41806], ["佐賀県", 33.24944, 130.29889], ["長崎県", 32.74472, 129.87361],
  ["熊本県", 32.78972, 130.74167], ["大分県", 33.23806, 131.6125], ["宮崎県", 31.91111, 131.42389],
  ["鹿児島県", 31.56028, 130.55806], ["沖縄県", 26.2125, 127.68111]
];

const WEATHER_MAP = {
  0: "晴れ", 1: "晴れ時々くもり", 2: "くもり", 3: "くもり", 45: "霧", 48: "霧",
  51: "霧雨", 53: "霧雨", 55: "霧雨", 61: "雨", 63: "雨", 65: "雨", 71: "雪", 73: "雪", 75: "雪",
  80: "にわか雨", 81: "にわか雨", 82: "にわか雨", 95: "雷雨"
};

const el = (id) => document.getElementById(id);
const fmt = (n) => Number.isFinite(n) ? n.toFixed(1) : "-";

function buildSelect() {
  PREFECTURES.forEach(([name]) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    el("prefectureSelect").appendChild(opt);
  });
  el("prefectureSelect").value = "埼玉県";
}

function dayNightAverages(dayIdx, daily, hourlyTimes, hourlyTemps) {
  const sunrise = new Date(daily.sunrise[dayIdx]);
  const sunset = new Date(daily.sunset[dayIdx]);
  const nextSunrise = new Date(daily.sunrise[Math.min(dayIdx + 1, daily.sunrise.length - 1)]);

  const dayVals = [];
  const nightVals = [];

  hourlyTimes.forEach((t, i) => {
    const dt = new Date(t);
    const temp = hourlyTemps[i];
    if (!Number.isFinite(temp)) return;
    if (dt >= sunrise && dt < sunset) dayVals.push(temp);
    if (dt >= sunset && dt < nextSunrise) nightVals.push(temp);
  });

  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
  return { dayAvg: avg(dayVals), nightAvg: avg(nightVals) };
}

async function fetchWeather(lat, lon, period) {
  const timezone = "Asia%2FTokyo";
  const dailyFields = "weather_code,temperature_2m_max,temperature_2m_min,shortwave_radiation_sum,sunrise,sunset,precipitation_sum";
  const hourlyFields = "temperature_2m,relative_humidity_2m";
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);

  if (period === "past") {
    start.setDate(today.getDate() - 6);
    const s = start.toISOString().slice(0, 10);
    const e = end.toISOString().slice(0, 10);
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${s}&end_date=${e}&daily=${dailyFields}&hourly=${hourlyFields}&timezone=${timezone}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("過去データの取得に失敗しました。");
    return res.json();
  }

  end.setDate(today.getDate() + 6);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${dailyFields}&hourly=${hourlyFields}&timezone=${timezone}&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("予報データの取得に失敗しました。");
  return res.json();
}

function render(data, prefecture) {
  const { daily, hourly } = data;
  const tbody = el("weatherTableBody");
  tbody.innerHTML = "";

  let sumRad = 0;
  let lowDays = 0;

  daily.time.forEach((date, i) => {
    const rad = daily.shortwave_radiation_sum[i];
    sumRad += rad || 0;
    if ((rad || 0) < 10) lowDays += 1;

    const { dayAvg, nightAvg } = dayNightAverages(i, daily, hourly.time, hourly.temperature_2m);
    const humidity = hourly.relative_humidity_2m.filter((_, idx) => hourly.time[idx].startsWith(date));
    const humidAvg = humidity.length ? humidity.reduce((a, b) => a + b, 0) / humidity.length : NaN;

    const tr = document.createElement("tr");
    if ((rad || 0) < 10) tr.classList.add("low-radiation");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${WEATHER_MAP[daily.weather_code[i]] || "不明"}</td>
      <td>${fmt(rad)}</td>
      <td>${fmt(daily.temperature_2m_max[i])}℃</td>
      <td>${fmt(daily.temperature_2m_min[i])}℃</td>
      <td>${fmt(dayAvg)}℃</td>
      <td>${fmt(nightAvg)}℃</td>
      <td>${fmt(daily.precipitation_sum[i])}mm</td>
      <td>${fmt(humidAvg)}%</td>
    `;
    tbody.appendChild(tr);
  });

  const avg = sumRad / daily.time.length;
  el("selectedPlace").textContent = `${prefecture}（県庁所在地）`;
  el("sumRadiation").textContent = fmt(sumRad);
  el("avgRadiation").textContent = fmt(avg);
  el("lowRadiationDays").textContent = lowDays;
  el("lowRadiationComment").textContent = lowDays >= 3 ? "低日射日が3日以上あります。管理に注意してください。" : "低日射リスクは比較的低めです。";
}

async function loadData() {
  el("errorBox").classList.add("hidden");
  el("weatherTableBody").innerHTML = '<tr><td colspan="9">データを読み込み中...</td></tr>';

  const prefecture = el("prefectureSelect").value;
  const period = el("periodSelect").value;
  const found = PREFECTURES.find(([name]) => name === prefecture);

  try {
    const [, lat, lon] = found;
    const data = await fetchWeather(lat, lon, period);
    if (!data?.daily || !data?.hourly) throw new Error("データ形式が不正です。");
    render(data, prefecture);
  } catch (err) {
    el("errorBox").textContent = `エラー: ${err.message} 通信状況や時間をあけて再試行してください。`;
    el("errorBox").classList.remove("hidden");
    el("weatherTableBody").innerHTML = '<tr><td colspan="9">データを表示できませんでした。</td></tr>';
  }
}

buildSelect();
el("loadButton").addEventListener("click", loadData);
loadData();
