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
    [4008, 6168, 8328],
    [3648, 5088, 7968],
    [2568, 4728, 6888]
  ]
  , strengthNames = ["无碎石事件", "黑石", "红石"]
  , lastTimeMs = 1000 * 60 * 52;

var tags = new Map()
  , f, slider;

function formatDate(date, short) {
  if (short)
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatWeekDay(date) {
  return "星期" + ["一", "二", "三", "四", "五", "六", "日"][(date.getDay() || 7) - 1]
}

function formatTime(date, short) {
  if (short)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

function formatTimeMs(t) {
  t /= 1000;
  return `${Math.floor(t / 3600).toString().padStart(2, '0')}:${Math.floor(t / 60 % 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
}

function utc8DateTime(date) {
  date || (date = new Date());
  return new Date(date.getTime() + date.getTimezoneOffset() * 6e4 + 288e5)
}

function utc8DayStart(date) {
  return Math.floor((date.getTime() + 288e5) / 864e5) * 864e5 - 288e5
}

function clamp(x, a, b) {
  return x < a ? a : x > b ? b : x;
}

function calcShardAt(date) {
  // Convert time to UTC+8
  date = utc8DateTime(date);

  var monthDay = date.getDate() - 1
    , weekday = (date.getDay() || 7) - 1
    , currentRealm = (monthDay + 3) % 5
    , uds = utc8DayStart(date)
    , currentShard = weekday == 6
      ? 2
      : monthDay < 15
        ? weekday == 1
          ? 1
          : weekday == 5
            ? 2
            : 0
        : weekday == 2
          ? 1
          : weekday == 4
            ? 2
            : 0
    , result = {
      strength: currentShard,
      strengthString: strengthNames[currentShard],
      realm: currentRealm,
      realmString: realmNames[currentRealm],
      realmHTML: `<span style="color:${realmColor[currentRealm]}">${realmNames[currentRealm]}</span>`,
      areaString: mapNames[currentRealm][weekday],
      areaAliasString: mapAliases[currentRealm][weekday],
      gainString: currency[currentShard],
      gainAmount: !currentShard ? 0 : currentShard == 1 ? blackGain : redGain[currentRealm][weekday],
      waves: [],
      endTime: 0
    };

  for (var w of waves[weekday])
    result.waves.push(new Date(uds + w * 1e4));
  result.endTime = result.waves[2].getTime() + lastTimeMs;

  return result
}

function calcWave(state, date) {
  var dt = date.getTime()
    , diff, wt;

  if (!state.strength)
    return { state: 0 };
  if ((diff = dt - state.waves[2].getTime() - lastTimeMs) > 0)
    // All waves have ended before ...
    return { state: 1, time: diff };
  if ((diff = state.waves[0].getTime() - dt) > 0)
    // The first wave will start after ...
    return { state: 2, time: diff };

  for (var w of state.waves) {
    wt = w.getTime();
    if (wt < dt && wt + lastTimeMs > dt)
      // Current wave will end after ...
      return {
        state: 3,
        time: wt + lastTimeMs - dt
      };
    if (wt > dt)
      // Next wave will start after ...
      return {
        state: 4,
        time: wt - dt
      }
  }
}

function setTitle(current) {
  var title = document.getElementById("title")
    , s = calcShardAt(current)
    , r = ""
    , t, w;

  if (!document.hidden)
    return title.innerText = "光遇国服碎石计算器";

  w = calcWave(s, current);
  switch (w.state) {
    case 0:
      r = "今日无碎石事件";
      break;
    case 1:
      r = "今日碎石事件已结束";
      break;
    case 2: case 4:
      t = Math.floor(w.time / 1000);
      r += s.strengthString + "将于"
      r += Math.floor(t / 3600).toString().padStart(2, '0') + "h";
      r += Math.floor(t / 60 % 60).toString().padStart(2, '0') + "m";
      r += "后降落在" + s.realmString + ": " + s.areaString;
      break;
    case 3:
      t = Math.floor(w.time / 1000);
      r += s.strengthString + "将于"
      r += Math.floor(t / 3600).toString().padStart(2, '0') + "h";
      r += Math.floor(t / 60 % 60).toString().padStart(2, '0') + "m";
      r += "后结束";
      break;
  }
  title.innerText = r;
}

function setNavTime(date) {
  var disp = document.getElementById("sky-gametime-disp")
    , dispShort = document.getElementById("sky-gametime-disp-short");

  disp.innerText = formatDate(date) + formatWeekDay(date) + "\u3000" + formatTime(date);
  dispShort.innerText = formatDate(date, 1) + "\u3000" + formatTime(date);
}

function createTag() {
  var r = document.createElement("div");
  r.classList.add("keen-slider__slide", "shard-slide");
  r.innerHTML = '<div class="shard-tag fancy-box"><div class="shard-location font-dynamic"><p class="shard-location-prefix"></p><p class="shard-location-alias"></p><p class="shard-location-disp"></p><p class="shard-gain"></p></div><div class="shard-timeline font-dynamic"><div class="shard-split"></div></div><div class="shard-countdown"><div class="shard-split"></div><div class="shard-countdown-container font-dynamic"><p class="shard-countdown-prefix"></p><p class="shard-countdown-disp"></p><p class="shard-countdown-text"></p></div></div></div>';
  return r
}

function createTimeline(periods) {
  function g(e, c) {
    var r = document.createElement(e);
    r.classList = c;
    return r
  }

  var r = document.createElement("div")
    , result = document.createElement("div")
    , s, t, u;

  r.classList.add("shard-timeline-line");
  r.innerHTML += '<div class="shard-timeline-cursor"></div>';
  for (var p of periods) {
    s = clamp(p.start, 0, 1);
    t = clamp(p.last, 0, 1 - p.start);
    u = g("div", "shard-timeline-segment");
    u.style.left = s * 100 + "%";
    u.style.width = t * 100 + "%";
    r.appendChild(u);

    u = g("a", "shard-timeline-text-up");
    u.style.left = s * 100 + "%";
    u.innerText = p.startText;
    r.appendChild(u);

    u = g("a", "shard-timeline-mark-up");
    u.style.left = `calc(${s * 100}% - 4px)`;
    r.appendChild(u);

    u = g("a", "shard-timeline-text-down");
    u.style.left = s * 100 + t * 100 + "%";
    u.innerText = p.endText;
    r.appendChild(u);

    u = g("a", "shard-timeline-mark-down");
    u.style.left = `calc(${s * 100 + t * 100}% - 4px)`;
    r.appendChild(u);
  }

  setTimelineCursor(r, 0);
  result.appendChild(r);
  result.classList = "shard-timeline-wrapper";

  return result
}

function setTimelineCursor(element, rate) {
  var c = element.querySelector(".shard-timeline-cursor");
  if (rate < 0 || rate > 1) {
    c.style.visibility = "hidden";
    return
  }
  c.style.visibility = "inherit";
  rate = clamp(rate, 0, 1);
  c.style.left = `calc(${rate * 100}% - 10px)`;
  return element
}

function updateTag(tag, shardState, date) {
  var $ = tag.querySelector.bind(tag)
    , d = Math.ceil((date - new Date()) / 864e5) || 0
    , uds = utc8DayStart(date)
    , s = !d ? "今天" : d == -1 ? "昨天" : d == 1 ? "明天" : d < 0 ? Math.abs(d) + "天前" : d + "天后"
    , t = [
      null,
      "<span style=\"color:#000;font-weight:bold\">黑石</span>",
      "<span style=\"color:#f00;font-weight:bold\">红石</span>"
    ]
    , u = tags.get(tag)
    , length;

  if (u.diff == s)
    return;
  u.diff = s;

  if (!shardState.strength) {
    // Hide external informations
    $(".shard-location-prefix").innerHTML = s;
    $(".shard-location-alias").innerText = "";
    $(".shard-location-disp").innerText = shardState.strengthString;
    $(".shard-gain").innerText = "";

    tag.querySelectorAll(":scope .shard-split").forEach(ele => ele.style.display = "none");
    $(".shard-timeline").style.display = "none";
    $(".shard-countdown").classList.add("hidden");
    $(".shard-tag").classList.add("shard-tag-empty");

    return
  }

  // Update shard location and gain
  $(".shard-location-prefix").innerHTML = s + " " + t[shardState.strength] + " 降落于";
  $(".shard-location-alias").innerText = shardState.areaAliasString.split("").join("\u3000");
  $(".shard-location-disp").innerHTML = shardState.realmHTML + ": " + shardState.areaString;
  $(".shard-gain").innerText = "预计可获取" + shardState.gainAmount + shardState.gainString;

  // Show external informations
  tag.querySelectorAll(":scope .shard-split").forEach(ele => ele.style.display = "");
  $(".shard-timeline").style.display = "";
  $(".shard-countdown").classList.remove("hidden");
  $(".shard-tag").classList.remove("shard-tag-empty");

  // Update timeline
  if (u.timeline)
    $(".shard-timeline").removeChild(u.timeline);

  length = shardState.waves[2] - shardState.waves[0] + lastTimeMs;

  u.timeline = createTimeline(shardState.waves.map(w => {
    return {
      start: (w - shardState.waves[0]) / length * 0.8 + 0.1,
      last: lastTimeMs / length,
      startText: formatTime(w, 1),
      endText: formatTime(new Date(-(-w) + lastTimeMs), 1)
    }
  }));
  $(".shard-timeline").appendChild(u.timeline);
  u.tick = function () {
    // Update timeline
    var t = Date.now(), w;
    if (t < uds || t > uds + 864e5)
      setTimelineCursor(u.timeline, -1);
    else if (t < shardState.waves[0])
      setTimelineCursor(u.timeline, (t - uds) / (shardState.waves[0] - uds) * 0.1);
    else if (t > shardState.endTime)
      setTimelineCursor(u.timeline, (shardState.endTime - t) / (uds + 864e5 - shardState.endTime) * 0.1);
    else
      setTimelineCursor(u.timeline, (t - shardState.waves[0]) / length * 0.8 + 0.1);

    // Update countdown
    w = calcWave(shardState, new Date());
    switch (w.state) {
      case 1:
        $(".shard-countdown-prefix").innerText = "所有碎石事件已在";
        $(".shard-countdown-disp").innerText = formatTimeMs(w.time);
        $(".shard-countdown-text").innerText = "前结束";
        break;
      case 2:
        $(".shard-countdown-prefix").innerText = "第一波碎石事件将于";
        $(".shard-countdown-disp").innerText = formatTimeMs(w.time);
        $(".shard-countdown-text").innerText = "后开始";
        break;
      case 4:
        $(".shard-countdown-prefix").innerText = "下一波碎石事件将于";
        $(".shard-countdown-disp").innerText = formatTimeMs(w.time);
        $(".shard-countdown-text").innerText = "后开始";
        break;
      case 3:
        $(".shard-countdown-prefix").innerText = "当前碎石事件将于";
        $(".shard-countdown-disp").innerText = formatTimeMs(w.time);
        $(".shard-countdown-text").innerText = "后结束";
        break;
    }
  };
  u.tick();
}

for (var i = 0, j; i < 2; i++) {
  j = createTag();
  document.getElementById("slider-container").appendChild(j);
  tags.set(j, {});
}

var slider = new KeenSlider("#slider-container", {
  initial: 0,
  loop: true,
  detailsChanged: f = function (e) {
    document.getElementById("goto").style.opacity = !e.track.details.abs ? 0 : 100;
    e.track.details.slides.map((slide) => {
      var r = new Date(Date.now() + slide.abs * 864e5);
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
  for (var e of tags.values())
    typeof e.tick == 'function' && e.tick()
})();
document.getElementById("sky-gametime-wrapper").onclick
  = document.getElementById("goto").onclick
  = function (e) {
    e.preventDefault();
    slider.moveToIdx(0, 1)
  };
document.addEventListener("visibilitychange", () => { setTitle(new Date()) });
slider.emit("animationEnded");
