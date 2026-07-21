const ASSETS = {
  temple: "./assets/scenes/ruined-temple-night.webp",
  river: "./assets/scenes/purple-gold-river-dawn.webp",
  alley: "./assets/combat/jinling-rain-ambush.webp",
  shenGate: "./assets/scenes/shen-manor-side-gate.webp",
  danroom: "./assets/scenes/shen-alchemy-room.webp",
};

const TEMPLE_SCREENS = new Set([
  "templeWake",
  "fateSight",
  "allocation",
  "templeTasks",
  "ladyArrival",
  "ladyPressure",
  "ladyTest",
  "nightTalk",
  "gameDeath",
  "quietDeparture",
  "encounterReward",
  "mindArt",
]);

const RIVER_SCREENS = new Set([
  "roadTrial",
  "roadResult",
  "ending",
  "fishingPrep",
  "riverFishing",
  "riverCatch",
  "wangEncounter",
  "treasureFish",
  "treasureShare",
  "wangTeaching",
]);

const M4_SHEN_GATE_SCREENS = new Set(["shenFuOffer", "dirtyMoneyChoice", "m4WorldEcho"]);
const SHEN_GATE_SCREENS = new Set(["shenArrival", "shenJobs", ...M4_SHEN_GATE_SCREENS]);

const DANROOM_SCREENS = new Set([
  "caoArrival",
  "caoFate",
  "bloodDemand",
  "danObservation",
  "caoExamFire",
  "caoExamIngredients",
  "caoExamMotive",
  "shenDeath",
  "qingQingReward",
  "qingQingStudy",
  "fiveAnimalReward",
  "caoDeparture",
]);

const WANG_SCREENS = new Set(["yanJinghongArrival", "wangBattle", "wangAftermath"]);
const M4_ALLEY_SCREENS = new Set(["shenFuReckoning", "m4Tracking", "sevenKillHouse", "shenFuConfrontation"]);

function hasTask(state, id) {
  return (state.completedTempleTasks || []).includes(id);
}

function hasInventory(state, id) {
  return (state.inventory || []).includes(id);
}

function templePresentation(screen, state) {
  const fireTended = screen !== "templeWake";
  const fateSeen = Boolean(state.destinyRevealed) || screen !== "templeWake";
  const ladyScreens = new Set(["ladyArrival", "ladyPressure", "ladyTest", "nightTalk", "gameDeath", "quietDeparture", "encounterReward", "mindArt"]);
  const identityKnown = new Set(["encounterReward", "mindArt"]).has(screen);
  const actors = [];

  if (ladyScreens.has(screen)) {
    actors.push({
      id: "green_lady",
      label: identityKnown ? "龙青鱼" : "青衣妇人",
      detail: identityKnown
        ? "漕帮帮主夫人。她已经把这一夜的情分与一门水行心法交给你。"
        : screen === "quietDeparture"
          ? "她正踏过门槛离去。这次擦肩之后，再无相遇条件。"
          : "她没有受伤，也没有追兵。真正危险的是她本人。",
      x: screen === "quietDeparture" ? 25 : 31,
      y: 58,
      kind: "lady",
      state: screen === "gameDeath" ? "danger" : identityKnown ? "allied" : "unknown",
    });
  }

  return {
    id: "ruined_temple",
    title: "金陵东郊 · 无名破庙",
    image: ASSETS.temple,
    alt: "雨夜破庙内，余火、供桌、新砌墙面和敞开的庙门分处四方",
    summary: ladyScreens.has(screen)
      ? "雨压在残瓦上，门口、火堆和青衣来客之间只隔着几步。"
      : "火堆、供桌和颜色异常的墙面都在眼前；先看清，再决定把今夜交给哪里。",
    tone: screen === "gameDeath" ? "death" : "rain",
    hotspots: [
      {
        id: "embers",
        label: fireTended ? "已经拨亮的余火" : "将熄的余火",
        detail: fireTended
          ? `火势暂时稳住，还能支撑约${Math.max(0, Number(state.fireMinutes || 0))}分钟。`
          : "炭心只剩一点红。吃下一枚山桃并拨亮余火，才能继续检查破庙。",
        x: 48,
        y: 79,
        state: fireTended ? "completed" : "available",
      },
      {
        id: "offering_table",
        label: "无像供桌",
        detail: fateSeen
          ? "供桌上没有神像，山桃却很新鲜。命格所见的贡品因果，要到初一晴日辰时才能继续。"
          : "供桌上没有神像，只摆着几枚新鲜山桃。荒庙里似乎一直有人送来贡品。",
        x: 76,
        y: 59,
        state: "locked",
      },
      {
        id: "patched_wall",
        label: hasTask(state, "traveler_relic") || hasTask(state, "shen_promise") ? "已经拆开的暗墙" : "新砌暗墙",
        detail: !fateSeen
          ? "东北角墙色更深，新旧砖缝对不上。墙后或许藏着东西。"
          : hasTask(state, "traveler_relic") || hasTask(state, "shen_promise")
            ? `你已经从墙后取出${[hasTask(state, "traveler_relic") ? "旅人遗物" : "", hasTask(state, "shen_promise") ? "沈字铜钱" : ""].filter(Boolean).join("与")}。`
            : "命格照见墙后的两段因果：旅人遗物与沈氏旧诺。砸墙仍要支付时间、山桃或力气。",
        x: 87,
        y: 42,
        state: hasTask(state, "traveler_relic") || hasTask(state, "shen_promise") ? "completed" : fateSeen ? "special" : "available",
      },
      {
        id: "doorway",
        label: "雨中的庙门",
        detail: ladyScreens.has(screen)
          ? "门外没有第二个人。雨声会遮住脚步，却遮不住聚气武者的杀机。"
          : "狼嚎在雨幕后断断续续。此刻离开破庙，比留在火边更危险。",
        x: 24,
        y: 48,
        state: ladyScreens.has(screen) ? "danger" : "available",
      },
    ],
    actors,
    player: { label: state.name || "陈司命", x: 57, y: 83 },
  };
}

function riverPresentation(screen, state) {
  const choseWater = state.roadTrial === "dive";
  const choseRoad = state.roadTrial === "detour";
  const fishingScreens = new Set(["riverFishing", "riverCatch", "wangEncounter", "treasureFish", "treasureShare", "wangTeaching"]);
  const wangVisible = new Set(["wangEncounter", "treasureFish", "treasureShare", "wangTeaching"]).has(screen);
  const actors = wangVisible ? [{
    id: "wang_wu",
    label: "王五",
    detail: "紫金河上的老渔人。他先看你如何处置鱼，再决定是否把打鱼杆法交出来。",
    x: 18,
    y: 70,
    kind: "fisher",
    state: Number(state.wangFavor || 0) >= 60 ? "allied" : "known",
  }] : [];

  return {
    id: "purple_gold_river",
    title: fishingScreens.has(screen) ? "紫金河 · 旧系船桩" : "钟山脚下 · 紫金河",
    image: ASSETS.river,
    alt: "晨雾中的紫金河与沿岸官道分别通向远处金陵",
    summary: fishingScreens.has(screen)
      ? "水流、旧桩和芦苇把一场垂钓分成了准备、等待与取舍。"
      : "河道直下东湖，官道绕山入城；新得的鱼跃龙门诀只会改变其中一条路。",
    tone: "dawn",
    hotspots: [
      {
        id: "water_route",
        label: choseWater ? "已经走通的水路" : "紫金河水路",
        detail: state.mindArt
          ? choseWater
            ? "你已经用鱼跃龙门诀顺流抵达东湖。这条路从此不再只是地图上的河。"
            : "鱼跃龙门诀可以让你半游半漂直抵东湖，节省眼下最缺的体力与干粮。"
          : "水势寒急。以未入门的身体贸然下水，只会被带进深流。",
        x: 48,
        y: 57,
        state: choseWater ? "completed" : state.mindArt ? "special" : "danger",
      },
      {
        id: "land_route",
        label: choseRoad ? "已经选择的官道" : "东岸官道",
        detail: choseRoad
          ? "你选择了更稳妥的陆路，也因此错过今日抵达沈家的时辰。"
          : "官道不必涉水，但以当前体力和干粮，很难在今日赶到东湖。",
        x: 88,
        y: 48,
        state: choseRoad ? "completed" : "available",
      },
      {
        id: "mooring_posts",
        label: "旧系船桩",
        detail: fishingScreens.has(screen)
          ? "水下暗流绕过木桩，黄金钱鳘只会在饵、时辰、钓法和熟人都齐备时靠岸。"
          : "缆绳已经腐断，桩边却留着新刮痕。紫金河并非无人往来。",
        x: 20,
        y: 72,
        state: fishingScreens.has(screen) ? "special" : "available",
      },
      {
        id: "jinling_silhouette",
        label: "雾中的金陵",
        detail: "城墙还很远。沈家、漕帮和血书所指的人，都藏在那片晨雾之后。",
        x: 51,
        y: 22,
        state: "known",
      },
    ],
    actors,
    player: { label: state.name || "陈司命", x: wangVisible ? 28 : 15, y: 84 },
  };
}

function shenGatePresentation(screen, state) {
  if (M4_SHEN_GATE_SCREENS.has(screen)) {
    const outcome = state.m4?.outcome;
    const gateState = state.m4?.locationStates?.shen_side_gate || "open";
    const dispositionLabel = { report: "送交内宅", share: "与沈福分账", hide: "由你藏匿", trap: "留作诱饵", refuse: "退回沈福" }[state.m4?.dirtyMoney?.disposition] || "尚未决定";
    const shenFuVisible = screen !== "m4WorldEcho" || outcome === "controlled";
    const actorLabels = { controlled: "受制的沈福", exposed: "内宅账房", released: "空着的位置", killed: "闭口的家丁" };
    return {
      id: "shen_side_gate",
      title: "东湖沈家 · 侧门",
      image: ASSETS.shenGate,
      alt: "东湖雾气中的沈家朱漆侧门、石狮、药箱和外院",
      summary: screen === "m4WorldEcho" ? "同一扇门没有搬动，认你的人、开门的条件和门后风险却已经变了。" : "曹青已经离城。沈福挑在侧门交出钱匣，是因为这里既属于沈家，又避开内宅账房。",
      tone: outcome === "killed" ? "death" : "overcast",
      hotspots: [
        { id: "vermilion_gate", label: gateState === "open" ? "仍会开启的侧门" : gateState === "watched_but_open" ? "有人盯着的侧门" : "已经变更规矩的侧门", detail: outcome === "controlled" ? "沈福还会开门，但每一次都附带交易与暴露。" : outcome === "exposed" ? "门房只认白栀云内宅发出的一次性口信。" : outcome ? "灶房、护院和侧门不再承认沈福留下的人情。" : "这扇门曾靠沈福的人情开启；今夜之后未必仍然如此。", x: 36, y: 45, state: outcome ? "danger" : "special" },
        { id: "money_chest", label: state.m4?.dirtyMoney?.disposition ? "已经有去处的钱匣" : "沉木钱匣", detail: state.m4?.dirtyMoney?.disposition ? `钱匣已经${dispositionLabel}，但来源、知情者和证据仍在。` : "箱角有河泥，锁是新的，内沿残着烧黑火漆。", x: 68, y: 72, state: state.m4?.dirtyMoney?.disposition ? "completed" : "danger" },
        { id: "inner_courtyard", label: "沈家内宅", detail: state.m4?.contacts?.replacement === "bai_steward" ? "白栀云的人已经接替一部分联络，却不会继承沈福全部灰色门路。" : "没有证据或人物担保，内宅不会只凭一句话处理沈福。", x: 52, y: 57, state: state.m4?.contacts?.replacement ? "special" : "locked" },
      ],
      actors: shenFuVisible ? [{ id: "shen_fu", label: screen === "m4WorldEcho" ? actorLabels[outcome] || "沈福" : "沈福", detail: outcome === "controlled" ? "他仍在笑，侧门钥匙却已经变成彼此的把柄。" : "从最初十两银子到今夜钱匣，他始终把人情当作能反复榨取的本钱。", x: 48, y: 64, kind: "steward", state: outcome === "controlled" ? "danger" : "known" }] : [],
      player: { label: state.name || "陈司命", x: 25, y: 84 },
    };
  }
  const inside = screen === "shenJobs";
  return {
    id: "shen_side_gate",
    title: inside ? "沈家外院" : "东湖岸 · 沈家侧门",
    image: ASSETS.shenGate,
    alt: "东湖雾气中的沈家朱漆侧门、石狮、药箱和外院",
    summary: inside
      ? "门已经开了，四份普通营生却仍把你挡在沈家的规矩之外。"
      : "一枚旧铜钱能让侧门开启，却不能替一个未入门少年赢得位置。",
    tone: "overcast",
    hotspots: [
      {
        id: "vermilion_gate",
        label: inside ? "已经开启的侧门" : "朱漆侧门",
        detail: inside
          ? "沈氏承诺已经兑现为一次营生分配。接下来，门内只认能力和用处。"
          : "正门不会为你开。门房只会在认出沈字铜钱后履行老太爷留下的旧诺。",
        x: 36,
        y: 45,
        state: inside ? "completed" : "special",
      },
      {
        id: "stone_lion",
        label: "侧门石狮",
        detail: "连侧门石狮都比破庙供桌完整。沈家的体面与规矩，从门外便开始压人。",
        x: 12,
        y: 61,
        state: "known",
      },
      {
        id: "medicine_crates",
        label: "成箱药材",
        detail: "药材按产地与用途分箱。沈家靠这些药维持田产、铺面、护院与内宅。",
        x: 77,
        y: 68,
        state: "available",
      },
      {
        id: "inner_courtyard",
        label: "外院深处",
        detail: inside
          ? "挑水、护院、跑腿、账房四份营生都摆在里面；你的条件没有一项够格。"
          : "门后晒着药，也站着家丁。信物只保证一口饭和一份营生。",
        x: 52,
        y: 57,
        state: inside ? "danger" : "locked",
      },
    ],
    actors: [{
      id: inside ? "outer_steward" : "gate_keeper",
      label: inside ? "外院管事" : "门房",
      detail: inside
        ? "他不问你吃过多少苦，只把四份营生的门槛一项项摆出来。"
        : "他认得铜钱，不敢赶你走，也没有把你当成沈家人。",
      x: 45,
      y: 62,
      kind: "keeper",
      state: "known",
    }],
    player: { label: state.name || "陈司命", x: 25, y: 84 },
  };
}

function m4AlleyPresentation(screen, state) {
  const atHouse = ["sevenKillHouse", "shenFuConfrontation"].includes(screen);
  const tracking = state.m4?.tracking || {};
  const outcome = state.m4?.outcome;
  const trackingLabel = { great: "大成", success: "得手", costly: "得手有损", failure: "失手但仍追到旧宅" }[tracking.grade] || "尚未落定";
  return {
    id: atHouse ? "qinhuai_old_house" : "qinhuai_night_lane",
    title: atHouse ? "秦淮河西 · 无名旧宅" : "秦淮河西 · 夜巷",
    image: ASSETS.alley,
    alt: "雨后秦淮夜巷、旧宅门窗、河道出口与远处尾灯",
    summary: atHouse ? "夹墙、刀匣、后门和门外脚步把旧宅分成证据、退路与冲突。" : "尾灯、河巷和摊棚让追踪不只是追上一个背影。",
    tone: outcome === "killed" ? "death" : "rain",
    hotspots: atHouse ? [
      { id: "hidden_wall", label: "夹墙暗账", detail: state.m4?.evidence?.includes("hidden_ledger") ? "账页写着沈福、收货日与一条不属于沈家的水路。" : "夹墙已被抢先撕走大半，只余墨痕和半页数字。", x: 23, y: 51, state: state.m4?.evidence?.includes("hidden_ledger") ? "completed" : "danger" },
      { id: "blade_case", label: "七道拓痕的刀匣", detail: state.m4?.sevenKillClue ? "拓纸已经取出。刀不在，七杀旧账却第一次与沈家练功残页相连。" : "暗层里可能还压着东西，翻找会惊动门外。", x: 53, y: 58, state: state.m4?.sevenKillClue ? "completed" : "special" },
      { id: "back_door", label: "临河后门", detail: "放沈福走、引内宅来人或在合围前取命，都要经过这扇门。", x: 83, y: 47, state: "danger" },
    ] : [
      { id: "tail_lamp", label: tracking.grade ? "已经看破的尾灯" : "隔巷尾灯", detail: tracking.grade ? `追踪${trackingLabel}，警觉提高${Number(tracking.alert || 0)}。` : "沈福在前，另有一盏灯始终与他隔着固定距离。", x: 76, y: 44, state: tracking.grade ? "completed" : "danger" },
      { id: "water_exit", label: "秦淮支流", detail: "鱼跃龙门诀与定海桩可以用水断踪，也可能把追逐带向更空旷的河面。", x: 18, y: 73, state: state.mindArt ? "special" : "available" },
      { id: "market_awning", label: "收摊后的旧布棚", detail: "遮挡能切断视线，也能让反跟踪者换掉灯与衣裳。", x: 48, y: 55, state: "available" },
    ],
    actors: [
      { id: "shen_fu", label: "沈福", detail: "他的脚步比平日快，却仍会在每个能看见身后的铜镜前稍停。", x: atHouse ? 62 : 71, y: atHouse ? 68 : 59, kind: "steward", state: "danger" },
    ],
    player: { label: state.name || "陈司命", x: 22, y: 84 },
  };
}

function danroomPresentation(screen, state) {
  const atPharmacy = screen === "caoDeparture";
  const identityKnown = Boolean(state.caoIdentitySeen) || screen !== "caoArrival";
  const bloodScreens = new Set(["bloodDemand", "danObservation", "caoExamFire", "caoExamIngredients", "caoExamMotive", "shenDeath", "qingQingReward"]);
  const bookOwned = hasInventory(state, "qingqing_book");
  const furnaceWorked = Number(state.alchemyProgress || 0) > 0 || bloodScreens.has(screen);
  const actors = [{
    id: "cao_qing",
    label: identityKnown ? "曹青" : "曹医师",
    detail: identityKnown
      ? "曹青只是化名。他真正衡量的不是忠诚，而是你是否有用、是否可信、是否会威胁他的秘密。"
      : "沈家客卿医师。五名药童都怕他，你还不知道这种恐惧从何而来。",
    x: 37,
    y: 67,
    kind: "cao",
    state: screen === "shenDeath" ? "danger" : Number(state.caoFavor || 0) >= 20 ? "known" : "unknown",
  }];

  if (new Set(["caoArrival", "bloodDemand"]).has(screen)) {
    actors.push({
      id: "danroom_apprentices",
      label: "五名药童",
      detail: "他们面色惨白、眼眶发黑。曹青点中你时，所有人都同时松了一口气。",
      x: 22,
      y: 72,
      kind: "apprentice",
      state: "unknown",
    });
  }

  const hotspots = [
    {
      id: "pill_furnace",
      label: furnaceWorked ? "正在炼药的丹炉" : "沉重丹炉",
      detail: furnaceWorked
        ? `火候与药序都藏在炉声里。当前炼丹见识已积到${Number(state.alchemyProgress || 0)}%。`
        : "炉身满是烟垢与旧火痕。药童守的是炉，曹青看的是药童能撑多久。",
      x: 54,
      y: 50,
      state: furnaceWorked ? "special" : "available",
    },
    {
      id: "water_basin",
      label: "水炼铜盆",
      detail: state.mindArt
        ? "鱼跃龙门诀让你更容易分辨加水、回流与药性沉浮，这会给水炼观察再添两分把握。"
        : "铜管把冷水引入盆中。水量与投药次序似乎同样重要。",
      x: 17,
      y: 78,
      state: state.mindArt ? "special" : "available",
    },
    {
      id: "medicine_cabinet",
      label: "百格药柜",
      detail: Number(state.medicalLevel || 0) > 0
        ? `你已经能认出其中一部分药材。当前医术${Number(state.medicalLevel || 0)}级。`
        : "抽屉没有题签。没有医术，强记位置也无法知道药材为何使用。",
      x: 85,
      y: 38,
      state: Number(state.medicalLevel || 0) > 0 ? "completed" : "locked",
    },
    {
      id: "worktable",
      label: bookOwned ? "《青青册》与药案" : "曹青的药案",
      detail: bookOwned
        ? "《青青册》把草药、脉象与舌苔从死记变成可以亲手使用的医术。"
        : "药臼、封罐和未写完的纸散在案上。曹青不允许普通药童翻看。",
      x: 82,
      y: 72,
      state: bookOwned ? "completed" : "locked",
    },
    {
      id: "side_door",
      label: "丹房侧门",
      detail: "门没有上锁。真正拦住药童的，是曹青、沈家规矩和外面无处可去的饥饿。",
      x: 27,
      y: 46,
      state: "danger",
    },
  ];

  if (bloodScreens.has(screen)) {
    hotspots.push({
      id: "blood_bowl",
      label: state.bloodChoice ? "已经取过血的木碗" : "木碗与红锈菜刀",
      detail: state.bloodChoice
        ? `这一碗血让你损失${Number(state.bloodLoss || 0)}点根骨，却换来一次留在炉边观察的机会。`
        : "曹青让你亲手取一碗血。反抗、拒绝和服从的后果已经被命格照见。",
      x: 72,
      y: 78,
      state: state.bloodChoice ? "completed" : "danger",
    });
  }

  return {
    id: "shen_danroom",
    title: atPharmacy ? "金陵东门 · 沈氏药铺" : "沈家后院 · 炼药房",
    image: ASSETS.danroom,
    alt: "沈家炼药房内有丹炉、水炼盆、百格药柜、药案与侧门",
    summary: atPharmacy ? "炉火还在，人却要走。曹青离开以后，这间药铺不会再替你自动提供指点、药材和担保。" : "丹炉、水盆、药柜与侧门都看得见。能否从材料变成有用的人，要看你如何观察和回答。",
    tone: screen === "shenDeath" ? "death" : "ember",
    hotspots,
    actors,
    player: { label: state.name || "陈司命", x: 58, y: 85 },
  };
}

function wangPresentation(screen, state) {
  const session = state.p0?.wangBattle;
  const atRiver = screen === "wangAftermath" || session?.battle?.stageId === "riverbank";
  const identityKnown = Boolean(session?.battle?.knownFacts?.includes("wang_identity")) || atRiver;
  const allySafe = Boolean(session?.battle?.conditions?.allySafe) || screen === "wangAftermath";
  return {
    id: atRiver ? "east_lake" : "willow_lane",
    title: atRiver ? "金陵 · 东湖河岸" : "金陵 · 柳巷晚市",
    image: atRiver ? ASSETS.river : ASSETS.alley,
    alt: atRiver ? "夜色中的东湖河岸、湿石、柳根、系舟桩与岸边小舟" : "雨后柳巷的摊棚、人流、临河门洞与远处尾随人影",
    summary: atRiver ? "湿石、浅水、木桩与小舟都能改变锁链刀、援弩和撤离路线。" : "先利用倒影、摊棚和人流看清尾随者，再让燕惊鸿带证物脱开视线。",
    tone: atRiver ? "dawn" : "rain",
    hotspots: atRiver ? [
      { id: "wet_bank", label: "湿滑石滩", detail: "普通落脚会削弱下盘；鱼跃龙门诀或定海桩可以把水势变成优势。", x: 30, y: 70, state: "danger" },
      { id: "mooring_post", label: "系舟木桩", detail: "木桩既能遮住弩线，也能迫使锁链刀改变回收轨迹。", x: 57, y: 58, state: "special" },
      { id: "loose_skiff", label: "船索与小舟", detail: "放松船索可以设绊，也可以换来护送燕惊鸿撤离的水路。", x: 86, y: 63, state: "available" },
    ] : [
      { id: "shop_reflection", label: "橱窗倒影", detail: identityKnown ? "倒影已经映出蛇纹铜牌和左腕锁扣。" : "不必回头，也许能从倒影看清尾随者藏兵的位置。", x: 23, y: 52, state: identityKnown ? "completed" : "special" },
      { id: "market_awning", label: "旧布摊棚", detail: "垂下的湿布能切断视线，逼尾随者在换位时露出左腕。", x: 50, y: 55, state: "available" },
      { id: "river_gate", label: "临河门洞", detail: allySafe ? "燕惊鸿已经带证物穿过门洞。" : "让燕惊鸿先过门洞，才能把同伴与尾随路线分开。", x: 82, y: 46, state: allySafe ? "completed" : "danger" },
    ],
    actors: [
      { id: "yan_jinghong", label: "燕惊鸿", detail: "巡检房暗差。她带着失踪药船卷宗，也在判断你是否值得托付后背。", x: atRiver ? 23 : 38, y: atRiver ? 75 : 69, kind: "ally", state: allySafe ? "allied" : "known" },
      { id: "wang_zhuo", label: identityKnown ? "王卓" : "尾随人影", detail: identityKnown ? "蛇纹铜牌、袖底锁链与聚气境气机已经暴露。" : "他始终隔着两处摊位，没有让你看清正脸。", x: atRiver ? 67 : 78, y: atRiver ? 59 : 61, kind: "enemy", state: "danger" },
    ],
    player: { label: state.name || "陈司命", x: atRiver ? 45 : 19, y: 84 },
  };
}

export function getScenePresentation(screen, state = {}) {
  if (TEMPLE_SCREENS.has(screen)) return templePresentation(screen, state);
  if (RIVER_SCREENS.has(screen)) return riverPresentation(screen, state);
  if (SHEN_GATE_SCREENS.has(screen)) return shenGatePresentation(screen, state);
  if (DANROOM_SCREENS.has(screen) || (screen === "shenDaily" && state.shenLocation !== "pharmacy")) return danroomPresentation(screen, state);
  if (WANG_SCREENS.has(screen)) return wangPresentation(screen, state);
  if (M4_ALLEY_SCREENS.has(screen)) return m4AlleyPresentation(screen, state);
  return null;
}

function routeStatus(currentScene, sceneIds, reached, known = true) {
  if (sceneIds.includes(currentScene)) return "current";
  if (reached) return "reached";
  return known ? "known" : "locked";
}

export function getRoutePresentation(screen, state = {}) {
  const scene = getScenePresentation(screen, state);
  if (!scene) return null;

  const nodes = [{
    id: "temple",
    label: "无名破庙",
    detail: "今夜的火、旧诺与青衣来客都从这里开始。",
    x: 9,
    y: 53,
    status: routeStatus(scene.id, ["ruined_temple"], true),
  }];

  const riverKnown = Boolean(state.mindArt || state.roadTrial || state.shenChapterStarted || ["purple_gold_river", "shen_side_gate", "shen_danroom"].includes(scene.id));
  if (riverKnown) {
    nodes.push({
      id: "river",
      label: "紫金河",
      detail: state.roadTrial === "dive" ? "鱼跃龙门诀已经把这条水路变成通往东湖的捷径。" : "水路直通东湖，官道绕山入城。",
      x: 35,
      y: 53,
      status: routeStatus(scene.id, ["purple_gold_river"], Boolean(state.roadTrial)),
    });
  } else {
    nodes.push({ id: "beyond_rain", label: "雨幕之外", detail: "你还不知道天明后该沿哪条路离开。", x: 35, y: 53, status: "locked" });
  }

  const shenKnown = hasTask(state, "shen_promise") || Boolean(state.shenChapterStarted) || ["shen_side_gate", "shen_danroom"].includes(scene.id);
  if (shenKnown) {
    nodes.push({
      id: "shen",
      label: "东湖沈家",
      detail: state.shenChapterStarted ? "旧诺已经兑成一份营生；沈家的规矩正在决定你能活成什么。" : "沈字铜钱可以换来一次侧门营生。",
      x: 63,
      y: 33,
      status: routeStatus(scene.id, ["shen_side_gate", "shen_danroom"], Boolean(state.shenChapterStarted)),
    });
  }

  const eastKnown = Boolean(state.shenMeetingSeen || state.shenLocation === "pharmacy" || state.p0?.started || state.m4?.started);
  if (eastKnown) {
    nodes.push({
      id: "east_gate",
      label: "金陵东门",
      detail: "沈氏药铺、长街夜杀与曹青后院都在此处交汇。",
      x: 88,
      y: 33,
      status: routeStatus(scene.id, ["willow_lane", "east_lake"], state.shenLocation === "pharmacy" || state.p0?.started),
    });
  }

  if (state.m4?.started) {
    nodes.push({
      id: "qinhuai",
      label: "秦淮旧宅",
      detail: state.m4.locationStates?.qinhuai_old_house === "hidden" ? "钱匣来路尚未把这处旧宅显出来。" : state.m4.sevenKillClue ? "夹墙暗账与七杀刀拓痕都从这里进入行录。" : "追踪已经把沈福的私账牵到河西旧宅。",
      x: 89,
      y: 74,
      status: routeStatus(scene.id, ["qinhuai_old_house", "qinhuai_night_lane"], state.m4.locationStates?.qinhuai_old_house !== "hidden", state.m4.locationStates?.qinhuai_old_house !== "hidden"),
    });
  }

  if (state.relationship) {
    nodes.push({
      id: "linan",
      label: "临安漕帮",
      detail: "龙青鱼留下了重逢条件，但这条水路尚未真正走通。",
      x: 63,
      y: 76,
      status: "known",
    });
  }

  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const pairs = [["temple", riverKnown ? "river" : "beyond_rain"], ["river", "shen"], ["shen", "east_gate"], ["east_gate", "qinhuai"], ["river", "linan"]];
  const edges = pairs
    .filter(([from, to]) => byId[from] && byId[to])
    .map(([from, to]) => ({ from, to }));

  return {
    title: "眼下所知的江湖",
    summary: nodes.some((node) => node.status === "current") ? "实线是已经看见的路；地点会随信物、关系和亲历逐步显形。" : "已知地点会随亲历逐步显形。",
    nodes,
    edges,
  };
}

export const SCENE_ASSET_PATHS = Object.freeze(Object.values(ASSETS));
