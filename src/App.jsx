// src/App.jsx
import { useEffect, useState, useCallback } from "react";

/**
 * Full test UI for Telegram Mini App
 * - кнопки/эмодзи как "картинки"
 * - поле ввода
 * - MainButton (отправляет sendData боту)
 * - кнопка POST → бекенд (VITE_API_URL must be set)
 *
 * Пометки:
 * - Установите VITE_API_URL в .env (например: VITE_API_URL=https://your-backend.example)
 * - sendData отправляет данные боту внутри Telegram (message.web_app_data)
 * - POST → сервер требует работающий бекенд (не GitHub Pages)
 */

export default function App() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");
  const [isInTelegram, setIsInTelegram] = useState(false);

  // helper to access Telegram WebApp safely
  const getTG = useCallback(() => {
    return typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp
      ? window.Telegram.WebApp
      : null;
  }, []);

  useEffect(() => {
    const tg = getTG();
    if (!tg) {
      setIsInTelegram(false);
      return;
    }
    setIsInTelegram(true);

    try {
      tg.ready();
      // try to expand to available height (some clients may ignore)
      try { tg.expand(); } catch (e) {}
      setUser(tg.initDataUnsafe?.user ?? null);
      console.log("TG initDataUnsafe:", tg.initDataUnsafe);
    } catch (e) {
      console.warn("Telegram WebApp init error:", e);
    }

    // Setup MainButton behaviour
    const onMain = () => {
      const payload = { type: "main_click", text, selected, ts: Date.now() };
      console.log("MainButton sendData ->", payload);
      try {
        tg.sendData(JSON.stringify(payload));
        setStatus("Отправлено боту через sendData");
      } catch (e) {
        console.error("sendData error:", e);
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

    // Cleanup on unmount
    return () => {
      try {
        tg.MainButton.offClick(onMain);
        tg.MainButton.hide();
      } catch (e) {}
    };
  }, [getTG, text, selected]);

  // sendData quick button (non-Main)
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
      console.error("sendData error:", e);
      setStatus("Ошибка sendData: " + e.message);
    }
  }

  // Robust sendToServer: checks resp.ok and content-type to avoid Unexpected token '<'
  async function sendToServer() {
    const apiBase = import.meta.env.VITE_API_URL ?? "";
    if (!apiBase) {
      setStatus("VITE_API_URL не задан. Установите VITE_API_URL в .env");
      return;
    }

    setStatus("Отправка на сервер...");
    const url = `${apiBase.replace(/\/$/, "")}/api/command`; // trim trailing slash
    const body = {
      action: "do_something",
      payload: { text, selected },
      // можно отправить initData для валидации на сервере
      initData: getTG()?.initData ?? null,
    };

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "TelegramWebApp", // простой маркер
        },
        body: JSON.stringify(body),
      });

      // quick diagnostics for "Unexpected token '<'"
      if (!resp.ok) {
        const textResp = await resp.text().catch(() => "<failed-to-read-body>");
        console.error("Server returned non-ok:", resp.status, resp.statusText, textResp.slice(0, 500));
        setStatus(`Ошибка сервера: ${resp.status} ${resp.statusText} — ${textResp.slice(0,200)}`);
        return;
      }

      const ctype = resp.headers.get("content-type") || "";
      if (ctype.includes("application/json")) {
        const data = await resp.json();
        console.log("Server JSON:", data);
        setStatus("Ответ сервера: " + (data?.message ?? JSON.stringify(data)));
      } else {
        // Received HTML or plain text (this is usually the cause of Unexpected token '<')
        const textResp = await resp.text();
        console.warn("Server returned non-JSON response:", textResp.slice(0, 800));
        setStatus("Не JSON ответ (см. консоль). Начало ответа: " + textResp.slice(0,200));
      }
    } catch (e) {
      console.error("Network/parse error:", e);
      setStatus("Ошибка сети/парсинга: " + e.message);
    }
  }

  // local convenience: clear fields
  function clearAll() {
    setText("");
    setSelected(null);
    setStatus("");
  }

  return (
    <div style={styles.page}>
      <h1 style={{ marginTop: 0 }}>TG Mini App — Test UI</h1>

      <p style={{ marginTop: 6 }}>
        {isInTelegram ? (user ? `Привет, ${user.first_name}` : "Открыто в Telegram") : "Открыто в браузере (не Telegram)"}
      </p>

      <div style={styles.row}>
        <input
          placeholder="Введите текст..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={styles.input}
        />
        <button onClick={() => setText("")} style={styles.btn}>Очистить</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 8 }}>Выбери картинку (эмодзи):</div>
        <div style={styles.emojis}>
          {["🍎", "🍌", "🍇", "🍑"].map((e) => (
            <button
              key={e}
              onClick={() => setSelected(e)}
              style={{
                ...styles.emojiBtn,
                boxShadow: selected === e ? "0 0 0 3px rgba(11,92,255,0.14)" : "none",
                transform: selected === e ? "translateY(-2px)" : "none",
              }}
              title={`Выбрать ${e}`}
            >
              <span style={{ fontSize: 28 }}>{e}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={sendDataToBot} style={styles.primary}>sendData → бот</button>
        <button onClick={sendToServer} style={styles.secondary}>POST → сервер</button>
        <button onClick={() => {
          // to trigger MainButton action directly (for debug)
          try { getTG()?.MainButton?.onClick?.(); } catch (e) { console.warn(e); }
        }} style={styles.ghost}>Trigger MainButton</button>
        <button onClick={clearAll} style={styles.ghost}>Сброс</button>
      </div>

      <div style={{ marginTop: 18 }}>
        <strong>Статус:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{status}</span>
      </div>

      <div style={{ marginTop: 18, color: "#666", fontSize: 13 }}>
        <div>Нужные переменные/пометки:</div>
        <ul>
          <li>Для POST → сервер: установите <code>VITE_API_URL</code> в файл <code>.env</code>.</li>
          <li>Если вы видите "Не JSON ответ" или сообщение начинающееся с <code>&lt;html&gt;</code> — проверьте URL бекенда (не указывайте GitHub Pages).</li>
          <li>sendData отправляет данные боту — вы увидите их в обработчике бота (update.message.web_app_data.data).</li>
        </ul>
      </div>
    </div>
  );
}

// simple inline styles
const styles = {
  page: {
    padding: 18,
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto",
    maxWidth: 720,
    margin: "0 auto",
  },
  row: { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  input: { padding: "10px 12px", flex: 1, borderRadius: 8, border: "1px solid #ddd" },
  btn: { padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },
  emojis: { display: "flex", gap: 8 },
  emojiBtn: {
    padding: 8, borderRadius: 10, border: "1px solid #eee", background: "#fff", cursor: "pointer", minWidth: 54, minHeight: 54,
  },
  primary: { background: "#0b69ff", color: "#fff", padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer" },
  secondary: { background: "#f1f5f9", color: "#111", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", cursor: "pointer" },
  ghost: { background: "transparent", color: "#111", padding: "8px 10px", borderRadius: 8, border: "1px dashed #ddd", cursor: "pointer" }
};
