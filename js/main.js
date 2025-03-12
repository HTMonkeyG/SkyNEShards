const realmNames = ["云野", "雨林", "霞谷", "暮土", "禁阁", "N/A"]
  , realmColor = ["#58E3F8", "#3875A9", "#ED669C", "#778804", "#4463DA"]
  , mapNames = [
    ["N/A", "蝴蝶平原", "仙乡", "N/A", "幽光山洞", "云顶浮石", "圣岛"],
    ["N/A", "荧光森林", "密林遗迹", "N/A", "大树屋", "神殿", "秘密花园"],
    ["N/A", "滑冰场", "滑冰场", "N/A", "圆梦村", "圆梦村", "雪隐峰"],
    ["N/A", "暮土一图", "远古战场", "N/A", "黑水港湾", "巨兽荒原", "失落方舟"],
    ["N/A", "星光沙漠", "星光沙漠", "N/A", "星漠大船", "星漠大船", "星漠大船"]
  ]
  , mapAliases = [
    ["", "", "三塔图", "", "左侧隐藏图", "右侧隐藏图", ""],
    ["", "雨林二图", "水母图", "", "", "", "老奶奶图"],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "沉船图", "四龙图", ""],
    ["", "", "", "", "", "", ""]
  ]
  , blackGain = 200
  , redGain = [
    [0, 0, 0, 0, 2, 2.5, 3.5],
    [0, 0, 0, 0, 2.5, 3.5, 3.5],
    [0, 0, 0, 0, 2.5, 2.5, 3.5],
    [0, 0, 0, 0, 2, 2.5, 3.5],
    [0, 0, 0, 0, 3.5, 3.5, 3.5]
  ]
  , currency = ["", "烛火", "升华蜡烛"]
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
  utc8DayStart = Math.floor(date.getTime() / 8.64e7) * 8.64e7 - 2.88e7;
  result = {
    strength: currentShard,
    strengthString: strengthNames[currentShard],
    realm: currentRealm,
    realmString: realmNames[currentRealm],
    realmHTML: `<span style="color:${realmColor[currentRealm]}">${realmNames[currentRealm]}</span>`,
    areaString: mapNames[currentRealm][weekday],
    areaAliasString: mapAliases[currentRealm][weekday],
    gainString: currency[currentShard],
    gainAmount: !currentShard ? 0 : currentShard == 1 ? blackGain : redGain[currentRealm][weekday],
    waves: []
  };

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
    return title.innerText = "光遇国服碎石计算器";
  if (!s.strength)
    return title.innerText = "今日无碎石事件";

  for (var a of s.waves) {
    if (a.getTime() < current.getTime() && a.getTime() + 3.12e6 > current.getTime()) {
      t = Math.floor((a.getTime() + 3.12e6 - current.getTime()) / 1000);
      r += s.strengthString + "将于"
      r += Math.floor(t / 3600).toString().padStart(2, '0') + "h";
      r += Math.floor(t / 60 % 60).toString().padStart(2, '0') + "m";
      r += "后结束";
      return title.innerText = r;
    }
    if (a.getTime() > current.getTime()) {
      t = Math.floor((a.getTime() - current.getTime()) / 1000);
      r += s.strengthString + "将于"
      r += Math.floor(t / 3600).toString().padStart(2, '0') + "h";
      r += Math.floor(t / 60 % 60).toString().padStart(2, '0') + "m";
      r += "后降落在" + s.realmString + ": " + s.areaString;
      return title.innerText = r;
    }
  }
  title.innerText = "今日碎石事件已结束"
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
  var $ = tag.querySelector.bind(tag)
    , r = Math.ceil((date - new Date()) / 8.64e7)
    , s = !r ? "今天" : r == -1 ? "昨天" : r == 1 ? "明天" : r < 0 ? Math.abs(r) + "天前" : r + "天后"
    , t = [
      null,
      "<span style=\"color:#000;font-weight:bold\">黑石</span>",
      "<span style=\"color:#f00;font-weight:bold\">红石</span>"
    ];

  if (!shardState.strength) {
    $(".shard-location-prefix").innerHTML = s;
    $(".shard-location-alias").innerText = "";
    $(".shard-location-disp").innerText = shardState.strengthString;
    $(".shard-gain").innerText = "";
    $(".shard-location").querySelector(".shard-split").style.display = "none";
    $(".shard-timeline").classList.add("hidden");
    $(".shard-countdown").classList.add("hidden");
    $(".shard-tag").classList.add("shard-tag-empty");
    return
  }

  $(".shard-countdown").classList.remove("hidden");
  $(".shard-timeline").classList.remove("hidden");
  $(".shard-location").querySelector(".shard-split").style.display = "none";
  $(".shard-tag").classList.remove("shard-tag-empty");
  $(".shard-location-prefix").innerHTML = s + " " + t[shardState.strength] + " 降落于";
  $(".shard-location-alias").innerText = shardState.areaAliasString.split("").join("\u3000");
  $(".shard-location-disp").innerHTML = shardState.realmHTML + ": " + shardState.areaString;
  $(".shard-gain").innerText = "预计可获取" + shardState.gainAmount + shardState.gainString;
  $(".shard-time-disp").innerText = date.toString();
}

var slider = new KeenSlider("#slider-container", {
  initial: 0,
  loop: true,
  detailsChanged: f = function (e) {
    e.track.details.slides.map((slide) => {
      var r = new Date(Date.now() + slide.abs * 8.64e7);
      try {
        updateTag(e.slides[e.track.absToRel(slide.abs)], calcShardAt(r), r)
      } catch (e) { }
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
document.getElementById("sky-gametime-wrapper").onclick = function () { slider.moveToIdx(0, 1) };
document.addEventListener("visibilitychange", () => { setTitle(new Date()) });
slider.emit("animationEnded");