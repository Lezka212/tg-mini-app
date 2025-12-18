// src/App.jsx
import { useEffect, useState } from "react";

function App() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState("");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    setUser(tg.initDataUnsafe?.user || null);

    // пример MainButton
    const onMain = () => {
      // отправим данные боту через sendData
      tg.sendData(JSON.stringify({ type: "main_click", text }));
    };

    tg.MainButton.setText("Отправить боту");
    tg.MainButton.show();
    tg.MainButton.onClick(onMain);

    return () => {
      try {
        tg.MainButton.hide();
        tg.MainButton.offClick(onMain);
      } catch (e) {}
    };
  }, [text]);

  // Отправка на ваш бекэнд (внешний сервер)
  async function sendToServer() {
    setStatus("Отправка...");
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/api/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // не кладите секреты сюда — используйте сервер для секретов
          "X-Requested-With": "TelegramWebApp",
        },
        body: JSON.stringify({
          action: "do_something",
          payload: { text, selected },
          // можно отправить initData если нужно валидировать на сервере
          initData: window.Telegram?.WebApp?.initData ?? null
        }),
      });
      const j = await resp.json();
      setStatus("Ответ сервера: " + (j?.message || JSON.stringify(j)));
    } catch (e) {
      setStatus("Ошибка: " + e.message);
    }
  }

  // Тест отправки через sendData (еще один пример)
  function sendDataToBot() {
    window.Telegram?.WebApp?.sendData(JSON.stringify({ type: "quick", payload: selected }));
  }

  return (
    <div style={{ padding: 16, fontFamily: "Inter, sans-serif" }}>
      <h2>Тестовый интерфейс Mini App</h2>
      <p>{user ? `Привет, ${user.first_name}` : "Открыто вне Telegram"}</p>

      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="введите текст..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ padding: 8, width: "60%" }}
        />
        <button onClick={() => setText("")} style={{ marginLeft: 8 }}>Очистить</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {/* Пример картинок-кнопок */}
        {["🍎","🍌","🍇","🍑"].map((emoji, i) => (
          <div
            key={i}
            onClick={() => setSelected(emoji)}
            style={{
              cursor: "pointer",
              fontSize: 32,
              padding: 8,
              borderRadius: 10,
              border: selected === emoji ? "2px solid #0b5cff" : "1px solid #ddd"
            }}
            title={`Выбрать ${emoji}`}
          >
            {emoji}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <button onClick={sendDataToBot} style={{ marginRight: 8 }}>sendData → бот</button>
        <button onClick={sendToServer}>POST → сервер</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Статус:</b> {status}
      </div>
    </div>
  );
}

export default App;
