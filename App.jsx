import { useState } from "react";

const MOCK_POSTS = [
  {
    id: 1,
    store: "ドン・キホーテ 渋谷店",
    character: "ちいかわ",
    product: "もちっとぬいぐるみ",
    stock: "たくさん",
    minutesAgo: 28,
    likes: 14,
    photo: null,
    tag: "ガチャ",
    confirmedSoldOut: false,
    confirmedAvailable: 5,
  },
  {
    id: 2,
    store: "アニメイト 池袋本店",
    character: "ポケモン",
    product: "一番くじ A賞",
    stock: "残り2個",
    minutesAgo: 185,
    likes: 8,
    photo: null,
    tag: "一番くじ",
    confirmedSoldOut: false,
    confirmedAvailable: 2,
  },
  {
    id: 3,
    store: "ロフト 新宿店",
    character: "サンリオ",
    product: "シナモロール フィギュア",
    stock: "売り切れ",
    minutesAgo: 2880,
    likes: 3,
    photo: null,
    tag: "フィギュア",
    confirmedSoldOut: true,
    confirmedAvailable: 0,
  },
  {
    id: 4,
    store: "トイザらス 秋葉原",
    character: "呪術廻戦",
    product: "ガチャ 全6種",
    stock: "少ない",
    minutesAgo: 62,
    likes: 21,
    photo: null,
    tag: "ガチャ",
    confirmedSoldOut: false,
    confirmedAvailable: 7,
  },
];

const CHARACTERS = ["ちいかわ", "ポケモン", "サンリオ", "呪術廻戦", "ワンピース", "その他"];
const TAGS = ["すべて", "ガチャ", "一番くじ", "フィギュア", "ぬいぐるみ"];
const STOCKS = ["たくさん", "少ない", "残り1個", "売り切れ"];

function freshnessColor(min) {
  if (min < 60) return { dot: "#4ade80", label: `${min}分前`, level: "新鮮" };
  if (min < 360) return { dot: "#fbbf24", label: `${Math.floor(min / 60)}時間前`, level: "やや古め" };
  return { dot: "#f87171", label: `${Math.floor(min / 1440)}日前`, level: "古い情報" };
}

function StockBadge({ stock }) {
  const map = {
    たくさん: "bg-emerald-100 text-emerald-700",
    少ない: "bg-yellow-100 text-yellow-700",
    "残り1個": "bg-orange-100 text-orange-700",
    "残り2個": "bg-orange-100 text-orange-700",
    売り切れ: "bg-red-100 text-red-500",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[stock] || "bg-gray-100 text-gray-500"}`}>
      {stock}
    </span>
  );
}

function PostCard({ post, onConfirm, onSoldOut }) {
  const fresh = freshnessColor(post.minutesAgo);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-50 p-4 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "#fce7f3", color: "#be185d" }}
            >
              {post.tag}
            </span>
            <span className="text-xs text-gray-400 font-medium">{post.character}</span>
          </div>
          <p className="font-bold text-gray-800 text-sm leading-snug">{post.product}</p>
          <p className="text-xs text-gray-500 mt-0.5">📍 {post.store}</p>
        </div>
        <StockBadge stock={post.stock} />
      </div>

      <div className="flex items-center gap-1.5 mt-2 mb-3">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: fresh.dot }}
        />
        <span className="text-xs text-gray-500">{fresh.label}</span>
        <span className="text-xs text-gray-300 mx-1">·</span>
        <span className="text-xs" style={{ color: fresh.dot }}>{fresh.level}</span>
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={() => onConfirm(post.id)}
          className="flex-1 text-xs py-1.5 rounded-xl font-semibold border transition-all"
          style={{ borderColor: "#86efac", color: "#16a34a", background: "#f0fdf4" }}
        >
          ✅ まだありました！({post.confirmedAvailable})
        </button>
        <button
          onClick={() => onSoldOut(post.id)}
          className="flex-1 text-xs py-1.5 rounded-xl font-semibold border transition-all"
          style={{ borderColor: "#fca5a5", color: "#dc2626", background: "#fff1f2" }}
        >
          😢 売り切れ
        </button>
      </div>
    </div>
  );
}

// 現在地から住所を取得するユーティリティ
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`;
  const res = await fetch(url, { headers: { "Accept-Language": "ja" } });
  const data = await res.json();
  const addr = data.address || {};
  // 建物名 or 店舗名があれば優先、なければ道路＋地区
  return (
    addr.shop ||
    addr.amenity ||
    addr.building ||
    [addr.road, addr.suburb || addr.neighbourhood || addr.city_district]
      .filter(Boolean)
      .join(" ") ||
    data.display_name?.split(",")[0] ||
    ""
  );
}

function PostModal({ onClose, onPost }) {
  const [store, setStore] = useState("");
  const [character, setCharacter] = useState("");
  const [product, setProduct] = useState("");
  const [stock, setStock] = useState("たくさん");
  const [tag, setTag] = useState("ガチャ");
  const [step, setStep] = useState(1);

  // 位置情報の状態
  const [locStatus, setLocStatus] = useState("idle"); // idle | asking | fetching | done | denied | error
  const [locAddress, setLocAddress] = useState("");
  const [coords, setCoords] = useState(null);

  // Step2に進むと同時に位置情報を促す
  const goToStep2 = () => {
    setStep(2);
    if (locStatus === "idle") {
      setLocStatus("asking");
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("error");
      return;
    }
    setLocStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const addr = await reverseGeocode(latitude, longitude);
          setLocAddress(addr);
          if (addr && !store) setStore(addr);
          setLocStatus("done");
        } catch {
          setLocStatus("error");
        }
      },
      () => {
        setLocStatus("denied");
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = () => {
    if (!store || !character || !product) return;
    onPost({ store, character, product, stock, tag, coords });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          🔍 発見を報告する
        </h2>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">カテゴリ</label>
              <div className="flex gap-2 flex-wrap">
                {["ガチャ", "一番くじ", "フィギュア", "ぬいぐるみ"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className="text-sm px-3 py-1.5 rounded-full border font-medium transition-all"
                    style={
                      tag === t
                        ? { background: "#fce7f3", borderColor: "#f9a8d4", color: "#be185d" }
                        : { background: "white", borderColor: "#e5e7eb", color: "#6b7280" }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">キャラクター</label>
              <div className="flex gap-2 flex-wrap">
                {CHARACTERS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCharacter(c)}
                    className="text-sm px-3 py-1.5 rounded-full border font-medium transition-all"
                    style={
                      character === c
                        ? { background: "#e0f2fe", borderColor: "#7dd3fc", color: "#0369a1" }
                        : { background: "white", borderColor: "#e5e7eb", color: "#6b7280" }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={goToStep2}
              disabled={!character || !tag}
              className="w-full py-3 rounded-2xl font-bold text-white mt-2 transition-opacity disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #f472b6, #a78bfa)" }}
            >
              次へ →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">

            {/* 位置情報プロンプト */}
            {locStatus === "asking" && (
              <div
                className="rounded-2xl p-4 flex gap-3 items-start"
                style={{ background: "linear-gradient(135deg, #ede9fe, #fce7f3)" }}
              >
                <span className="text-2xl">📍</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-purple-800 mb-0.5">
                    今いる場所を自動登録しませんか？
                  </p>
                  <p className="text-xs text-purple-600 mb-3">
                    現在地から店舗名を自動で入力します。手入力より30秒速くなります！
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGetLocation}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #a78bfa, #f472b6)" }}
                    >
                      📍 現在地を使う
                    </button>
                    <button
                      onClick={() => setLocStatus("denied")}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 border"
                    >
                      手入力する
                    </button>
                  </div>
                </div>
              </div>
            )}

            {locStatus === "fetching" && (
              <div
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "#f5f3ff" }}
              >
                <span className="text-lg animate-spin">🌀</span>
                <p className="text-xs text-purple-600 font-medium">現在地を取得中…</p>
              </div>
            )}

            {locStatus === "done" && locAddress && (
              <div
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "#f0fdf4", border: "1px solid #86efac" }}
              >
                <span className="text-lg">✅</span>
                <div className="flex-1">
                  <p className="text-xs text-green-700 font-bold">現在地を取得しました</p>
                  <p className="text-xs text-green-600">{locAddress}</p>
                </div>
                <button
                  onClick={() => { setLocAddress(""); setStore(""); setLocStatus("denied"); }}
                  className="text-xs text-gray-300 hover:text-gray-400"
                >
                  ✕
                </button>
              </div>
            )}

            {locStatus === "denied" && (
              <div
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "#fafafa", border: "1px dashed #e5e7eb" }}
              >
                <span className="text-base">✏️</span>
                <p className="text-xs text-gray-400">店舗名を手入力してください</p>
                <button
                  onClick={() => setLocStatus("asking")}
                  className="ml-auto text-xs text-purple-400 underline"
                >
                  現在地を使う
                </button>
              </div>
            )}

            {locStatus === "error" && (
              <div
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "#fff1f2", border: "1px solid #fca5a5" }}
              >
                <span className="text-base">⚠️</span>
                <p className="text-xs text-red-400">位置情報の取得に失敗しました。手入力してください。</p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">商品名</label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300"
                placeholder="例：もちっとぬいぐるみ"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                <span>店舗名</span>
                {locStatus === "done" && <span className="text-green-500 text-xs">📍 自動入力済み</span>}
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300"
                placeholder="例：ドン・キホーテ 渋谷店"
                value={store}
                onChange={(e) => setStore(e.target.value)}
              />
              {locStatus === "done" && (
                <p className="text-xs text-gray-400 mt-1">
                  ※ 店舗名が違う場合は直接編集できます
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">在庫状況</label>
              <div className="flex gap-2 flex-wrap">
                {STOCKS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStock(s)}
                    className="text-sm px-3 py-1.5 rounded-full border font-medium transition-all"
                    style={
                      stock === s
                        ? { background: "#ecfdf5", borderColor: "#6ee7b7", color: "#047857" }
                        : { background: "white", borderColor: "#e5e7eb", color: "#6b7280" }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-2xl font-bold border text-gray-500"
              >
                ← 戻る
              </button>
              <button
                onClick={handleSubmit}
                disabled={!store || !product}
                className="flex-1 py-3 rounded-2xl font-bold text-white transition-opacity disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f472b6, #a78bfa)" }}
              >
                投稿する 🎉
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WishlistModal({ wishlist, onClose, onRemove }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-5" />
        <h2 className="text-lg font-bold text-gray-800 mb-4">⭐ 欲しいリスト</h2>
        {wishlist.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">まだ登録がありません</p>
        ) : (
          <div className="space-y-2">
            {wishlist.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-pink-50 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-sm text-gray-800">{item.product}</p>
                  <p className="text-xs text-gray-500">{item.character} · {item.tag}</p>
                </div>
                <button onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-400 text-lg">✕</button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-2xl font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f472b6, #a78bfa)" }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export default function GachaMap() {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [activeTab, setActiveTab] = useState("すべて");
  const [showPostModal, setShowPostModal] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [wishlist, setWishlist] = useState([
    { product: "もちっとぬいぐるみ", character: "ちいかわ", tag: "ガチャ" },
  ]);
  const [toastMsg, setToastMsg] = useState(null);
  const [points, setPoints] = useState(120);

  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handlePost = (data) => {
    const newPost = {
      id: Date.now(),
      ...data,
      minutesAgo: 0,
      likes: 0,
      confirmedSoldOut: false,
      confirmedAvailable: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
    setPoints((p) => p + 30);
    toast("✨ 投稿しました！+30pt獲得！");
  };

  const handleConfirm = (id) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, confirmedAvailable: p.confirmedAvailable + 1 } : p
      )
    );
    toast("👍 ありがとう！情報を更新しました");
  };

  const handleSoldOut = (id) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, confirmedSoldOut: true, stock: "売り切れ" } : p
      )
    );
    toast("😢 売り切れ情報を更新しました");
  };

  const filtered =
    activeTab === "すべて" ? posts : posts.filter((p) => p.tag === activeTab);

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #fdf2f8 0%, #f0fdf9 100%)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 pt-5 pb-3"
        style={{ background: "rgba(253,242,248,0.92)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1
              className="text-xl font-black tracking-tight"
              style={{ color: "#be185d" }}
            >
              🗺️ GachaMap
            </h1>
            <p className="text-xs text-gray-400">推しグッズ発見マップ</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWishlist(true)}
              className="relative text-lg"
            >
              ⭐
              {wishlist.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
                  style={{ background: "#f472b6", fontSize: "9px" }}
                >
                  {wishlist.length}
                </span>
              )}
            </button>
            <div
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: "#fce7f3", color: "#be185d" }}
            >
              ✨ {points}pt
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap border transition-all"
              style={
                activeTab === t
                  ? { background: "#be185d", color: "white", borderColor: "#be185d" }
                  : { background: "white", color: "#9ca3af", borderColor: "#f3f4f6" }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 flex gap-3">
        {[
          { label: "本日の投稿", value: `${posts.length}件` },
          { label: "確認済み", value: `${posts.filter((p) => p.confirmedAvailable > 0).length}件` },
          { label: "在庫あり", value: `${posts.filter((p) => p.stock !== "売り切れ").length}件` },
        ].map((s) => (
          <div
            key={s.label}
            className="flex-1 bg-white rounded-2xl px-3 py-2 text-center shadow-sm border border-pink-50"
          >
            <p className="text-lg font-black" style={{ color: "#be185d" }}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Wishlist alert */}
      {wishlist.length > 0 && (
        <div
          className="mx-4 my-2 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #fce7f3, #ede9fe)" }}
        >
          <span className="text-xl">🔔</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-purple-800">欲しいリスト通知</p>
            <p className="text-xs text-purple-600">
              「{wishlist[0].product}」が近くで見つかったら通知します
            </p>
          </div>
        </div>
      )}

      {/* Post list */}
      <div className="px-4 pt-2 pb-28">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">まだ投稿がありません</p>
            <p className="text-xs mt-1">最初に発見を報告してみましょう！</p>
          </div>
        ) : (
          filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onConfirm={handleConfirm}
              onSoldOut={handleSoldOut}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4">
        <button
          onClick={() => setShowPostModal(true)}
          className="shadow-lg text-white font-bold text-base px-8 py-4 rounded-full flex items-center gap-2 transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, #f472b6, #a78bfa)",
            boxShadow: "0 4px 24px rgba(244,114,182,0.4)",
          }}
        >
          <span className="text-xl">＋</span> 発見を報告する
        </button>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #f472b6, #a78bfa)" }}
        >
          {toastMsg}
        </div>
      )}

      {showPostModal && (
        <PostModal onClose={() => setShowPostModal(false)} onPost={handlePost} />
      )}
      {showWishlist && (
        <WishlistModal
          wishlist={wishlist}
          onClose={() => setShowWishlist(false)}
          onRemove={(i) => setWishlist((w) => w.filter((_, idx) => idx !== i))}
        />
      )}
    </div>
  );
}
