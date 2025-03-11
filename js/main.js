const realmNames = ["云野", "雨林", "霞谷", "暮土", "禁阁", "N/A"]
  , mapNames = {
    0: ["N/A", "蝴蝶平原", "仙乡", "N/A", "幽光山洞", "云顶浮石", "圣岛"],
    1: ["N/A", "荧光森林", "密林遗迹", "N/A", "大树屋", "神殿", "秘密花园"],
    2: ["N/A", "滑冰场", "滑冰场", "N/A", "圆梦村", "圆梦村", "雪隐峰"],
    3: ["N/A", "暮土一图", "远古战场", "N/A", "黑水港湾(沉船图)", "巨兽荒原", "失落方舟"],
    4: ["N/A", "星光沙漠", "星光沙漠", "N/A", "星漠大船", "星漠大船", "星漠大船"]
  }
  , waves = [
    [0, 0, 0],
    [3288, 5088, 6888],
    [3288, 5448, 7608],
    [0, 0, 0],
    [4008, 6168, 4728],
    [3648, 5088, 7968],
    [2568, 4728, 6888]
  ]
  , strengthNames = ["无碎石事件", "黑石", "红石"]
  , lastTimeMs = 1000 * 60 * 52;

var initSeqCache = new Map(), f;

function formatDate(date, type) {
  if (type == 1)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatWeekDay(date) {
  return "星期" + ["一", "二", "三", "四", "五", "六", "日"][(date.getDay() || 7) - 1]
}

function formatTime(date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

function utc8DateTime(date) {
  date || (date = new Date());
  return new Date(date.getTime() + date.getTimezoneOffset() * 6e4 + 2.88e7)
}

function getWndSize() {
  return [
    window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth,
    window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
  ]
}

function calcShardAt(date) {
  // Convert time to UTC+8
  date = utc8DateTime(date);

  var monthDay = date.getDate() - 1
    , weekday = (date.getDay() || 7) - 1
    , initSeq = { black: [], red: [] }
    , result = {}
    , seqWeekday
    , currentShard
    , currentRealm
    , utc8DayStart
    , r;

  // Get the day of the week for the first day of the month
  seqWeekday = (weekday - monthDay) % 7;
  seqWeekday < 0 && (seqWeekday += 7);
  // Try to get sequence from cache
  if (initSeqCache.has(seqWeekday))
    initSeq = initSeqCache.get(seqWeekday);
  else {
    // Calculate initial sequence
    r = seqWeekday;
    for (var i = 0; i < 15; i++) {
      initSeq.black.push(seqWeekday == 1 ? 1 : 0);
      initSeq.red.push(seqWeekday == 5 ? 2 : 0);
      seqWeekday = (seqWeekday + 1) % 7;
    }
    initSeqCache.set(r, initSeq);
  }

  // Calculate current shard state
  if (weekday == 6)
    // If Sunday, then must be a red shard,
    currentShard = 2;
  else if (monthDay < 16)
    // Or calculate sequence shard.
    // If month day < 16, then just apply the initial sequence.
    currentShard = initSeq.black[monthDay] | initSeq.red[monthDay];
  else
    // Else remove the first two days of initial red sequence,
    // and repeat the modified sequence.
    currentShard = initSeq.black[(monthDay - 15) % 15] | initSeq.red[(monthDay - 13) % 15];

  currentRealm = (monthDay + 3) % 5;
  result.strength = currentShard;
  result.strengthString = strengthNames[currentShard];
  result.realmString = realmNames[currentRealm];
  result.areaString = mapNames[currentRealm][weekday];
  result.waves = [];
  utc8DayStart = Math.floor(date.getTime() / 8.64e7) * 8.64e7 - 2.88e7;
  for (var w of waves[weekday])
    result.waves.push(new Date(utc8DayStart + w * 1e4));

  return result
}

function setTitle(current) {
  var title = document.getElementById("title")
    , s = calcShardAt(current)
    , r = ""
    , t;

  if (!document.hidden)
    return title.innerText = "光遇国服碎石计时器";
  if (!s.strength)
    return title.innerText = "今日无碎石事件";

  for (var a of s.waves) {
    if (a.getTime() < current.getTime() && a.getTime() + 3.12e6 > current.getTime()) {
      t = Math.floor((a.getTime() + 3.12e6 - current.getTime()) / 1000);
      r += s.strengthString + "将于"
      r += Math.floor(t / 3600).toString().padStart(2, '0') + "h";
      r += Math.floor(t / 60 % 60).toString().padStart(2, '0') + "m";
      r += "后结束";
      break
    }
    if (a.getTime() > current.getTime()) {
      t = Math.floor((a.getTime() - current.getTime()) / 1000);
      r += s.strengthString + "将于"
      r += Math.floor(t / 3600).toString().padStart(2, '0') + "h";
      r += Math.floor(t / 60 % 60).toString().padStart(2, '0') + "m";
      r += "后降落在" + s.realmString + ": " + s.areaString;
      break
    }
  }
  title.innerText = r;
}

function setNavTime(date) {
  var navTimeDisp = document.getElementById("sky-gametime-disp")
    , wndSize = getWndSize()
    , r = "";

  if (wndSize[0] < 500)
    r += formatDate(date, 1) + "\u3000";
  else
    r += formatDate(date) + formatWeekDay(date) + "\u3000";

  r += formatTime(date);

  navTimeDisp.innerText = r;
}

function createTag() {
}

function updateTag(tag, shardState, date) {
  var r = Math.ceil((date - new Date()) / 8.64e7)
    , s = !r ? "今天" : r == -1 ? "昨天" : r == 1 ? "明天" : r < 0 ? Math.abs(r) + "天前" : r + "天后"
    , t = [
      null,
      "<span style=\"color:#000;font-weight:bold\">黑石</span>",
      "<span style=\"color:#f00;font-weight:bold\">红石</span>"
    ];

  if (!shardState.strength) {
    tag.querySelector(".shard-location-prefix").innerHTML = s;
    tag.querySelector(".shard-location-disp").innerText = shardState.strengthString;
    return
  }

  tag.querySelector(
    ".shard-location-prefix"
  ).innerHTML = s + " " + t[shardState.strength] + " 降落于";
  tag.querySelector(
    ".shard-location-disp"
  ).innerText = shardState.realmString + ": " + shardState.areaString;
  tag.querySelector(
    ".shard-time-disp"
  ).innerText = date.toString() + (shardState.strength ? shardState.strengthString + " " : shardState.strengthString)
}

var slider = new KeenSlider("#slider-container", {
  initial: 0,
  loop: true,
  detailsChanged: f = function (e) {
    e.track.details.slides.map((slide) => {
      var r = new Date();
      if (slide.abs != 0)
        r = new Date((Math.floor(r.getTime() / 8.64e7) + slide.abs) * 8.64e7 + r.getTimezoneOffset() * 6e4);
      updateTag(e.slides[e.track.absToRel(slide.abs)], calcShardAt(r), r);
    })
  },
  animationEnded: f,
  slides: () => [
    {
      origin: 0.1,
      spacing: 0.5,
      size: 0.8
    },
    {
      origin: 0.1,
      spacing: 0.5,
      size: 0.8
    }
  ]
});

(function a() {
  var b = new Date();
  setTitle(b);
  setNavTime(utc8DateTime(b));
  window.setTimeout(a, 1000);
})();
document.getElementById("sky-gametime-wrapper").onclick = function () { slider.moveToIdx(0, 1), slider.moveToIdx(0, 1) };
document.addEventListener("visibilitychange", () => { setTitle(new Date()) });
slider.emit("animationEnded");