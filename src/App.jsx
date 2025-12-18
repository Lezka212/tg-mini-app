// src/App.jsx
import { useEffect, useState, useCallback } from "react";

export default function App() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [scheme, setScheme] = useState("light");

  const getTG = useCallback(() => {
    return typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp
      ? window.Telegram.WebApp
      : null;
  }, []);

  useEffect(() => {
    const tg = getTG();
    if (!tg) {
      setIsInTelegram(false);
      // also detect system theme as fallback
      setScheme(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      return;
    }
    setIsInTelegram(true);

    try {
      tg.ready();
      setUser(tg.initDataUnsafe?.user ?? null);
      const cs = tg.colorScheme || "light";
      setScheme(cs);

      // react to theme changes if client supports it
      try {
        tg.onEvent("themeChanged", () => {
          setScheme(tg.colorScheme || "light");
        });
      } catch (e) {}
    } catch (e) {
      console.warn("TG init error:", e);
    }
  }, [getTG]);

  useEffect(() => {
    const tg = getTG();
    if (!tg) return;

    const onMain = () => {
      const payload = { type: "main_click", text, selected, ts: Date.now() };
      console.log("MainButton sendData ->", payload);
      try {
        tg.sendData(JSON.stringify(payload));
        setStatus("Отправлено боту через sendData");
      } catch (e) {
        setStatus("Ошибка sendData: " + e.message);
      }
    };

    try {
      tg.MainButton.setText("Отправить боту");
      tg.MainButton.show();
      tg.MainButton.onClick(onMain);
    } catch (e) {
      console.warn("MainButton not available:", e);
    }

    return () => {
      try {
        tg.MainButton.offClick(onMain);
        tg.MainButton.hide();
      } catch (e) {}
    };
  }, [getTG, text, selected]);

  function sendDataToBot() {
    const tg = getTG();
    if (!tg) {
      setStatus("Не в Telegram: sendData недоступен");
      return;
    }
    const payload = { type: "quick", selected, text, ts: Date.now() };
    console.log("sendData ->", payload);
    try {
      tg.sendData(JSON.stringify(payload));
      setStatus("sendData: отправлено боту");
    } catch (e) {
      setStatus("Ошибка sendData: " + e.message);
    }
  }

  async function sendToServer() {
    const apiBase = import.meta.env.VITE_API_URL ?? "";
    if (!apiBase) {
      setStatus("VITE_API_URL не задан. Установите VITE_API_URL в .env");
      return;
    }

    setStatus("Отправка на сервер...");
    const url = `${apiBase.replace(/\/$/, "")}/api/command`;
    const body = {
      action: "do_something",
      payload: { text, selected },
      initData: getTG()?.initData ?? null,
    };

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "TelegramWebApp",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const textResp = await resp.text().catch(() => "<failed-to-read-body>");
        setStatus(`Ошибка сервера: ${resp.status} ${resp.statusText} — ${textResp.slice(0,200)}`);
        return;
      }

      const ctype = resp.headers.get("content-type") || "";
      if (ctype.includes("application/json")) {
        const data = await resp.json();
        setStatus("Ответ сервера: " + (data?.message ?? JSON.stringify(data)));
      } else {
        const textResp = await resp.text();
        setStatus("Не JSON ответ (см. консоль). Начало ответа: " + textResp.slice(0,200));
      }
    } catch (e) {
      setStatus("Ошибка сети/парсинга: " + e.message);
    }
  }

  function clearAll() {
    setText("");
    setSelected(null);
    setStatus("");
  }

  // theme styles
  const dark = scheme === "dark";
  const bg = dark ? "#111317" : "#f8fafc";
  const card = dark ? "#0f1720" : "#fff";
  const textColor = dark ? "#e6eef9" : "#0f1720";
  const subtle = dark ? "#94a3b8" : "#64748b";

  return (
    <div style={{ padding: 18, fontFamily: "Inter, system-ui, -apple-system", background: bg, minHeight: "100vh", color: textColor }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>TG Mini App — Test UI</h1>
        <p style={{ color: subtle, marginTop: 6 }}>
          {isInTelegram ? (user ? `Привет, ${user.first_name}` : "Открыто в Telegram") : "Открыто в браузере (не Telegram)"}
        </p>

        <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: card, boxShadow: dark ? "none" : "0 6px 18px rgba(15,23,42,0.06)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              placeholder="Введите текст..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.06)", background: dark ? "#0b1220" : "#fff", color: textColor }}
            />
            <button onClick={() => setText("")} style={btnStyle(card, dark)}>Очистить</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 8, color: subtle }}>Выбери картинку:</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["🍎","🍌","🍇","🍑"].map((e) => (
                <button
                  key={e}
                  onClick={() => setSelected(e)}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: selected === e ? `2px solid ${dark ? "#60a5fa" : "#0b69ff"}` : "1px solid rgba(148,163,184,0.12)",
                    background: dark ? "#061024" : "#fff",
                    cursor: "pointer",
                    fontSize: 22,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={sendDataToBot} style={primaryBtn(dark)}>sendData → бот</button>
            <button onClick={sendToServer} style={secondaryBtn(dark)}>POST → сервер</button>
            <button onClick={clearAll} style={ghostBtn(dark)}>Сброс</button>
          </div>

          <div style={{ marginTop: 12, color: subtle }}>
            <strong>Статус:</strong> <span style={{ color: textColor }}>{status}</span>
          </div>
        </div>

        <div style={{ marginTop: 14, color: subtle, fontSize: 13 }}>
          <ul>
            <li>Если видите &lt;html&gt; в статусе — проверьте <code>VITE_API_URL</code> (не должен указывать на GitHub Pages).</li>
            <li>sendData отправляет данные боту: бот получит их в <code>message.web_app_data.data</code>.</li>
            <li>Открывайте WebApp **через** кнопку бота или WebApp-клавиатуру — иначе sendData не дойдёт до бота.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function btnStyle(card, dark) {
  return {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.06)",
    background: "transparent",
    cursor: "pointer",
  };
}

function primaryBtn(dark) {
  return {
    background: dark ? "#0b69ff" : "#0b69ff",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
  };
}
function secondaryBtn(dark) {
  return {
    background: dark ? "transparent" : "#f1f5f9",
    color: dark ? "#dbeafe" : "#111827",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.08)",
    cursor: "pointer",
  };
}
function ghostBtn(dark) {
  return {
    background: "transparent",
    color: dark ? "#cbd5e1" : "#111827",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px dashed rgba(148,163,184,0.06)",
    cursor: "pointer",
  };
}
