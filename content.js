(() => {
  if (typeof window.__OMEGA_CLEANUP__ === "function") {
    try { window.__OMEGA_CLEANUP__(); } catch (e) {}
  }
  ["nasa-docker-host", "titan-docker-host", "omega-docker-host", "infinity-docker-host", "simple-ai-bot-root"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  const timers = [];
  window.__OMEGA_CLEANUP__ = () => {
    timers.forEach(t => clearInterval(t));
    const el = document.getElementById("simple-ai-bot-root");
    if (el) el.remove();
  };

  async function callServer(endpoint, method = "POST", body = null) {
    return new Promise((resolve) => {
      const directFetch = () => {
        fetch(`http://127.0.0.1:5000${endpoint}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined
        })
          .then(r => r.json())
          .then(data => resolve({ ok: true, data }))
          .catch(err => resolve({ ok: false, error: err.message }));
      };

      try {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ type: "API", endpoint, method, body }, (res) => {
            if (chrome.runtime.lastError || !res) directFetch();
            else resolve(res);
          });
        } else {
          directFetch();
        }
      } catch (e) {
        directFetch();
      }
    });
  }

  // کپی مطمئن در کلیپ‌بورد (کاملاً مستقل از لوپ)
  async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed; top:-9999px; left:-9999px; opacity:0;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    }
  }

  // ساخت پنل قابل تغییر اندازه (Resizable) با ۳ دکمه اصلی و کادر ترمینال اسکرول‌شونده
  const root = document.createElement("div");
  root.id = "simple-ai-bot-root";
  root.style.cssText = "position:fixed; bottom:18px; left:18px; width:370px; min-width:310px; max-width:90vw; z-index:2147483647; background:#111827; color:#f9fafb; border:2px solid #10b981; border-radius:14px; box-shadow:0 15px 45px rgba(0,0,0,0.85); font-family:system-ui,-apple-system,sans-serif; direction:rtl; text-align:right; font-size:12px; overflow:hidden; resize:horizontal;";

  ["keydown", "keyup", "keypress"].forEach(ev => {
    root.addEventListener(ev, (e) => e.stopPropagation());
  });

  root.innerHTML = `
    <!-- هدر قابل جابجایی -->
    <div id="s-header" style="background:#064e3b; padding:9px 12px; display:flex; justify-content:space-between; align-items:center; cursor:move; border-bottom:1px solid #047857; user-select:none;">
      <div style="display:flex; align-items:center; gap:7px; font-weight:bold; font-size:13px;">
        <span id="s-dot" style="width:10px; height:10px; border-radius:50%; background:#34d399; display:inline-block;"></span>
        <span>ربات هوشمند داکر v12</span>
      </div>
      <span id="s-status" style="font-size:11px; background:rgba(0,0,0,0.45); padding:3px 8px; border-radius:6px; color:#a7f3d0; font-weight:bold;">آماده</span>
    </div>

    <div style="padding:10px; display:flex; flex-direction:column; gap:9px;">
      
      <!-- ۱. فقط ۳ دکمه اصلی: اجرا / پاز / استاپ -->
      <div style="display:grid; grid-template-columns:1.3fr 1fr 1fr; gap:6px;">
        <button id="btn-play" style="background:#10b981; color:#000; border:none; border-radius:8px; padding:10px 6px; font-weight:900; font-size:13px; cursor:pointer; box-shadow:0 0 12px rgba(16,185,129,0.4);">▶️ اجرا</button>
        <button id="btn-pause" style="background:#f59e0b; color:#000; border:none; border-radius:8px; padding:10px 6px; font-weight:800; font-size:12.5px; cursor:pointer; opacity:0.5;">⏸️ پاز</button>
        <button id="btn-stop" style="background:#ef4444; color:#fff; border:none; border-radius:8px; padding:10px 6px; font-weight:800; font-size:12.5px; cursor:pointer; opacity:0.5;">⏹️ استاپ</button>
      </div>

      <!-- ۲. کادرهای نوبتی دستور شما (سبز شونده) -->
      <div style="background:#1f2937; padding:8px; border-radius:10px; border:1px solid #374151;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight:bold; color:#fbbf24; font-size:11.5px;">✍️ دستورات نوبتی من به چت‌بات:</span>
          <div style="display:flex; gap:4px;">
            <button id="s-add-box" style="background:#2563eb; color:#fff; border:none; border-radius:5px; padding:3px 8px; font-size:11px; cursor:pointer; font-weight:bold;">➕ کادر جدید</button>
            <button id="s-reset-boxes" style="background:#4b5563; color:#fff; border:none; border-radius:5px; padding:3px 7px; font-size:11px; cursor:pointer;">🔄 ریست</button>
          </div>
        </div>
        <div id="s-boxes-list" style="display:flex; flex-direction:column; gap:5px; max-height:125px; overflow-y:auto;"></div>
      </div>

      <!-- ۳. نوار بالای ترمینال داکر + دکمه مستقل کپی گزارش داکر -->
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#9ca3af; padding:0 2px;">
        <span>🖥️ ترمینال زنده داکر (گوشه پایین را بکشید تا بزرگ شود):</span>
        <button id="btn-copy-docker" style="background:#374151; color:#38bdf8; border:1px solid #4b5563; border-radius:6px; padding:3px 9px; font-size:11px; font-weight:bold; cursor:pointer;">📋 کپی گزارش داکر</button>
      </div>

      <!-- ۴. کادر ترمینال داکر (قابل تغییر اندازه + اسکرول خودکار به آخرین خط) -->
      <pre id="s-log" style="margin:0; background:#030712; color:#34d399; border:1px solid #374151; border-radius:8px; padding:8px; height:130px; min-height:70px; max-height:550px; overflow-y:auto; resize:vertical; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:10.5px; line-height:1.45; direction:ltr; text-align:left; white-space:pre-wrap; word-break:break-word;"></pre>
    </div>
  `;
  document.body.appendChild(root);

  const $ = (id) => document.getElementById(id);
  const statusEl = $("s-status");
  const logBox = $("s-log");
  const playBtn = $("btn-play");
  const pauseBtn = $("btn-pause");
  const stopBtn = $("btn-stop");
  const copyDockerBtn = $("btn-copy-docker");

  // تابع نوشتن در کادر ترمینال که همیشه اسکرول را به آخرین خط (پایین‌ترین نقطه) می‌برد!
  function setTerminalLog(text) {
    logBox.textContent = text;
    logBox.scrollTop = logBox.scrollHeight;
  }

  // بازیابی آخرین گزارش داکر از حافظه تا حتی بعد از رفتن به چت جدید هم در کادر پایین دیده شود
  let lastRawDockerOutput = localStorage.getItem("DOCKER_BOT_LAST_RAW_LOG") || "";
  if (lastRawDockerOutput) {
    setTerminalLog(lastRawDockerOutput);
  } else {
    setTerminalLog("آماده به کار. روی «▶️ اجرا» کلیک کنید...");
  }

  // دکمه مستقل کپی گزارش داکر (بدون هیچ ارتباطی با لوپ و چت‌بات)
  copyDockerBtn.onclick = async () => {
    const textToCopy = lastRawDockerOutput || logBox.textContent || "";
    await copyTextToClipboard(textToCopy);
    const oldTxt = copyDockerBtn.innerText;
    copyDockerBtn.innerText = "✅ کپی شد!";
    copyDockerBtn.style.background = "#065f46";
    copyDockerBtn.style.color = "#fff";
    setTimeout(() => {
      copyDockerBtn.innerText = oldTxt;
      copyDockerBtn.style.background = "#374151";
      copyDockerBtn.style.color = "#38bdf8";
    }, 1500);
  };

  // جابجایی پنل با ماوس
  let isDrag = false, dx = 0, dy = 0;
  $("s-header").onmousedown = (e) => {
    isDrag = true;
    const r = root.getBoundingClientRect();
    dx = e.clientX - r.left;
    dy = e.clientY - r.top;
    root.style.bottom = "auto";
  };
  window.addEventListener("mousemove", (e) => {
    if (!isDrag) return;
    root.style.left = Math.max(5, Math.min(window.innerWidth - 320, e.clientX - dx)) + "px";
    root.style.top = Math.max(5, Math.min(window.innerHeight - 60, e.clientY - dy)) + "px";
  });
  window.addEventListener("mouseup", () => { isDrag = false; });

  // ================= ۱. مدیریت کادرهای نوبتی شما (سبز شونده) =================
  let steps = JSON.parse(localStorage.getItem("SIMPLE_AI_STEPS") || '[{"text":"","sent":false},{"text":"","sent":false}]');
  function saveSteps() {
    localStorage.setItem("SIMPLE_AI_STEPS", JSON.stringify(steps));
  }

  function renderSteps() {
    const container = $("s-boxes-list");
    container.innerHTML = "";
    const nextIndex = steps.findIndex(s => !s.sent && s.text.trim() !== "");

    steps.forEach((step, idx) => {
      const row = document.createElement("div");
      const bg = step.sent ? "#065f46" : (idx === nextIndex ? "#374151" : "#111827");
      const border = step.sent ? "#10b981" : (idx === nextIndex ? "#fbbf24" : "#4b5563");
      row.style.cssText = `display:flex; align-items:center; gap:5px; background:${bg}; border:1px solid ${border}; padding:4px 6px; border-radius:6px;`;

      const num = document.createElement("span");
      num.innerText = step.sent ? `✅ #${idx + 1}` : `#${idx + 1}`;
      num.style.cssText = "font-size:10.5px; font-weight:bold; white-space:nowrap; color:" + (step.sent ? "#34d399" : "#fbbf24");

      const inp = document.createElement("input");
      inp.type = "text";
      inp.value = step.text;
      inp.placeholder = `دستور نوبت ${idx + 1} را اینجا بنویسید...`;
      inp.style.cssText = "flex:1; background:rgba(0,0,0,0.45); color:#fff; border:none; border-radius:4px; padding:4px 6px; font-size:11px; outline:none; direction:rtl;";
      inp.oninput = () => {
        step.text = inp.value;
        saveSteps();
      };

      const del = document.createElement("button");
      del.innerText = "✖";
      del.style.cssText = "background:none; border:none; color:#9ca3af; cursor:pointer; font-size:11px;";
      del.onclick = () => {
        if (steps.length > 1) steps.splice(idx, 1);
        else { steps[0].text = ""; steps[0].sent = false; }
        saveSteps();
        renderSteps();
      };

      row.appendChild(num);
      row.appendChild(inp);
      row.appendChild(del);
      container.appendChild(row);
    });
  }

  function consumeNextUserBox() {
    const idx = steps.findIndex(s => !s.sent && s.text.trim() !== "");
    if (idx === -1) return "";
    const txt = steps[idx].text.trim();
    steps[idx].sent = true;
    saveSteps();
    renderSteps();
    return txt;
  }

  $("s-add-box").onclick = () => {
    steps.push({ text: "", sent: false });
    saveSteps();
    renderSteps();
  };

  $("s-reset-boxes").onclick = () => {
    steps.forEach(s => { s.sent = false; });
    saveSteps();
    renderSteps();
  };

  renderSteps();

  // ================= ۲. رصد هوشمند موانع صفحه (رفرش شدن، تغییر آدرس، پر شدن چت، لودینگ) =================
  let lastKnownUrl = location.href;
  let urlChangeTimestamp = Date.now();

  function checkUrlTransition() {
    if (location.href !== lastKnownUrl) {
      lastKnownUrl = location.href;
      urlChangeTimestamp = Date.now();
      processedBlockCount = 0;
    }
  }

  function isPageStillSettling() {
    checkUrlTransition();
    // اگر کمتر از ۴ ثانیه از تغییر آدرس یا باز شدن چت جدید گذشته است، صبر کن و عجله نکن!
    if (Date.now() - urlChangeTimestamp < 4000) return true;
    const editor = getVisibleEditor();
    if (!editor) return true;
    return false;
  }

  function isContextWindowFull() {
    const bodyText = document.body.innerText || "";
    return bodyText.includes("Context window full") || bodyText.includes("Start a new chat with an automatic summary");
  }

  function getUserMessageCountOnPage() {
    return document.querySelectorAll('[data-message-author-role="user"], .user-query').length;
  }

  function getAiCodeBlocks() {
    return Array.from(document.querySelectorAll("pre")).filter(pre => {
      if (pre.closest("#simple-ai-bot-root")) return false;
      if (pre.closest('[data-message-author-role="user"]')) return false;
      return true;
    });
  }

  function cleanCodeText(pre) {
    const codeNode = pre.querySelector("code") || pre.querySelector(".cm-content");
    if (codeNode) {
      return (codeNode.innerText || codeNode.textContent || "").replace(/\u00a0/g, " ").trim();
    }
    const clone = pre.cloneNode(true);
    clone.querySelectorAll("button, .sr-only").forEach(b => b.remove());
    let txt = (clone.innerText || clone.textContent || "").replace(/\u00a0/g, " ").trim();
    return txt.replace(/^(bash|sh|zsh|shell|Copy code|کپی کردن کد)\s*\n/i, "").trim();
  }

  function transitionToNewChatSafely(messageToCarry) {
    if (messageToCarry) {
      localStorage.setItem("DOCKER_BOT_UNSENT_PAYLOAD", messageToCarry);
    }
    localStorage.setItem("DOCKER_BOT_LOOP_STATE", "RUNNING");
    statusEl.innerText = "🔄 چت پر شد! انتقال به چت جدید...";

    const allBtns = Array.from(document.querySelectorAll("button, a"));
    const newChatBtn = allBtns.find(b => (b.innerText || "").trim() === "New chat" && b.offsetParent !== null);

    urlChangeTimestamp = Date.now();
    if (newChatBtn) {
      newChatBtn.click();
    } else {
      window.location.href = "https://chatgpt.com/";
    }
  }

  // ================= ۳. تزریق با دقت بالا و راستی‌آزمایی ارسال (Verification) =================
  function getVisibleEditor() {
    const all = [
      ...document.querySelectorAll('div#prompt-textarea[contenteditable="true"]'),
      ...document.querySelectorAll('div.ProseMirror[contenteditable="true"]'),
      ...document.querySelectorAll('div[contenteditable="true"][role="textbox"]'),
      ...document.querySelectorAll('.ql-editor[contenteditable="true"]'),
      ...document.querySelectorAll('textarea#prompt-textarea'),
      ...document.querySelectorAll('textarea')
    ];
    return all.find(el => el.offsetParent !== null) || all[0];
  }

  function findRealSendButton() {
    // هرگز دکمه میکروفون/Voice را اشتباهی نگیرد؛ فقط دکمه واقعی Send!
    const selectors = [
      'button[data-testid="send-button"]',
      'button[data-testid="fruitjuice-send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'button[aria-label*="ارسال"]',
      'button.send-button'
    ];
    for (const sel of selectors) {
      const btns = Array.from(document.querySelectorAll(sel));
      const found = btns.find(b => b.offsetParent !== null && !b.disabled && b.getAttribute("aria-disabled") !== "true");
      if (found) return found;
    }
    return null;
  }

  function triggerFullClick(btn) {
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(t => {
      btn.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    });
  }

  async function sendToChatbotWithVerification(messageText) {
    // ذخیره پیام در حافظه دائمی تا زمانی که ۱۰۰٪ مطمئن شویم ارسال شده است!
    localStorage.setItem("DOCKER_BOT_UNSENT_PAYLOAD", messageText);

    if (isContextWindowFull()) {
      transitionToNewChatSafely(messageText);
      return false;
    }

    // اگر صفحه در حال رفرش یا تغییر آدرس است، صبر کن!
    let waitCount = 0;
    while (isPageStillSettling() && waitCount < 10) {
      statusEl.innerText = "⏳ صبر برای آماده‌سازی صفحه...";
      await new Promise(r => setTimeout(r, 600));
      waitCount++;
    }

    const editor = getVisibleEditor();
    if (!editor) {
      statusEl.innerText = "⏳ منتظر کادر چت...";
      return false;
    }

    const userMsgCountBefore = getUserMessageCountOnPage();
    statusEl.innerText = "📋 درج گزارش در کادر چت...";

    editor.focus();

    if (editor.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(editor, messageText);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      editor.innerHTML = "<p><br></p>";
      editor.focus();

      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      sel.removeAllRanges();
      sel.addRange(range);

      // ۱. رویداد واقعی Paste برای فعال کردن دکمه آبی ارسال (↑)
      const dt = new DataTransfer();
      dt.setData("text/plain", messageText);
      editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));

      await new Promise(r => setTimeout(r, 120));
      if ((editor.innerText || "").trim().length < 5) {
        editor.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, messageText);
      }

      await new Promise(r => setTimeout(r, 120));
      if ((editor.innerText || "").trim().length < 5) {
        editor.innerHTML = messageText.split("\n").map(l => `<p>${l.replace(/&/g,"&amp;").replace(/</g,"&lt;") || "<br>"}</p>`).join("");
        editor.focus();
        document.execCommand("insertText", false, " ");
        editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: " " }));
      }
    }

    // مکث کوتاه (۶۰۰ میلی‌ثانیه) تا متن کامل در کادر بنشیند و دکمه آبی ↑ روشن شود
    await new Promise(r => setTimeout(r, 600));

    // تلاش برای کلیک روی دکمه ارسال و سپس راستی‌آزمایی اینکه واقعاً پیام به چت رفته است!
    return new Promise((resolve) => {
      let tries = 0;
      const timer = setInterval(async () => {
        tries++;

        if (isContextWindowFull()) {
          clearInterval(timer);
          transitionToNewChatSafely(messageText);
          resolve(false);
          return;
        }

        const sendBtn = findRealSendButton();
        if (sendBtn) {
          clearInterval(timer);
          sendBtn.click();
          triggerFullClick(sendBtn);
          statusEl.innerText = "🔍 بررسی ارسال پیام...";

          // ۱.۵ ثانیه صبر کن و چک کن آیا واقعاً پیام در چت ثبت شد یا صفحه پرید؟
          await new Promise(r => setTimeout(r, 1500));
          const userMsgCountAfter = getUserMessageCountOnPage();
          const currentEditor = getVisibleEditor();
          const editorNowEmpty = !currentEditor || (currentEditor.innerText || currentEditor.value || "").trim().length < 10;

          if (userMsgCountAfter > userMsgCountBefore || (editorNowEmpty && !isPageStillSettling())) {
            // پیام ۱۰۰٪ با موفقیت ارسال شده است! حالا از حافظه موقت پاکش کن
            localStorage.removeItem("DOCKER_BOT_UNSENT_PAYLOAD");
            statusEl.innerText = "✍️ منتظر کد چت‌بات...";
            resolve(true);
          } else {
            // پیام هنوز ارسال نشده (مثلاً صفحه وسط کار رفرش شده)؛ در حافظه می‌ماند تا در چرخه بعد ارسال شود
            statusEl.innerText = "🔄 تلاش مجدد برای ارسال...";
            resolve(false);
          }
        } else if (tries === 5 && editor.tagName !== "TEXTAREA") {
          editor.focus();
          document.execCommand("insertText", false, " ");
          editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: " " }));
        } else if (tries > 16) {
          clearInterval(timer);
          editor.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          await new Promise(r => setTimeout(r, 1200));
          if (getUserMessageCountOnPage() > userMsgCountBefore) {
            localStorage.removeItem("DOCKER_BOT_UNSENT_PAYLOAD");
            statusEl.innerText = "✍️ منتظر کد چت‌بات...";
            resolve(true);
          } else {
            resolve(false);
          }
        }
      }, 200);
    });
  }

  // ================= ۴. موتور اصلی لوپ خودکار + استریم زنده خطوط داکر =================
  let loopState = localStorage.getItem("DOCKER_BOT_LOOP_STATE") || "STOPPED";
  let isWorking = false;
  let processedBlockCount = getAiCodeBlocks().length;
  let lastExecutedCodeText = "";
  let prevSeenCode = "";
  let prevMainTextLen = 0;
  let stableTicks = 0;

  function setLoopState(newState) {
    loopState = newState;
    localStorage.setItem("DOCKER_BOT_LOOP_STATE", newState);
    playBtn.style.opacity = loopState === "RUNNING" ? "0.5" : "1";
    pauseBtn.style.opacity = loopState === "RUNNING" ? "1" : "0.5";
    stopBtn.style.opacity = loopState !== "STOPPED" ? "1" : "0.5";
  }
  setLoopState(loopState);

  function buildReplyMessageForAi(dockerOut, exitCode) {
    let trimmed = dockerOut;
    if (trimmed.length > 2200) {
      trimmed = trimmed.slice(0, 700) + "\n\n... [بخشی از خروجی برای جلوگیری از پر شدن حافظه چت خلاصه شد] ...\n\n" + trimmed.slice(-1500);
    }

    const userInstruction = consumeNextUserBox();

    let msg = `[گزارش ترمینال داکر | Exit Code: ${exitCode}]\n=== خروجی ترمینال ===\n${trimmed}\n====================\n`;
    if (userInstruction) {
      msg += `\n🎯 دستور جدید کاربر (کد بعدی را دقیقاً بر مبنای این خواسته و گزارش بالا بنویس):\n« ${userInstruction} »\n`;
    }
    msg += `\n⚠️ قوانین اجباری:
1. صد در صد (100%) فقط و فقط یک بلوک کد اجرایی bash بنویس و مطلقاً هیچ توضیح اضافه‌ای ننویس.
2. در انتهای کد bash خودت خلاصه گزارش وضعیت را با echo چاپ کن تا در مرحله بعد که خروجی را برایت می‌فرستم بدانی چه کدی باید بنویسی.`;
    return msg;
  }

  async function runOneCycle(codeToRun, currentBlocksCount) {
    isWorking = true;
    processedBlockCount = currentBlocksCount;
    lastExecutedCodeText = codeToRun;

    statusEl.innerText = "⚙️ در حال اجرا در داکر...";
    setTerminalLog(`📥 در حال اجرای کد در داکر:\n----------------------------------\n${codeToRun}\n----------------------------------\n⏳ منتظر خروجی زنده...`);

    // نمایش زنده خطوط در حال اجرا در کادر پایین و اسکرول خودکار به آخرین خط!
    const livePoll = setInterval(async () => {
      if (!isWorking) return;
      const live = await callServer("/live-log", "GET");
      if (live.ok && live.data.log) {
        setTerminalLog(`⚙️ در حال اجرا در داکر:\n${codeToRun}\n\n📡 خروجی زنده لحظه‌ای:\n${live.data.log}`);
      }
    }, 900);

    const res = await callServer("/execute", "POST", { command: codeToRun });
    clearInterval(livePoll);

    if (loopState !== "RUNNING") {
      isWorking = false;
      return;
    }

    if (!res.ok) {
      statusEl.innerText = "❌ خطای پورت 5000";
      setTerminalLog("خطا: سرور پایتون در ترمینال مک روشن نیست!\n" + res.error);
      setLoopState("PAUSED");
      isWorking = false;
      return;
    }

    let dockerOut = res.data.output || "انجام شد.";
    const exitCode = res.data.exit_code;

    // ذخیره آخرین گزارش خام داکر برای دکمه «📋 کپی گزارش داکر» و نمایش در انتهای کادر
    lastRawDockerOutput = dockerOut;
    localStorage.setItem("DOCKER_BOT_LAST_RAW_LOG", dockerOut);
    setTerminalLog(`📥 کد اجراشده:\n${codeToRun}\n\n📤 گزارش نهایی داکر (Exit Code: ${exitCode}):\n==================================\n${dockerOut}`);

    const messageForAi = buildReplyMessageForAi(dockerOut, exitCode);
    processedBlockCount = getAiCodeBlocks().length;

    await sendToChatbotWithVerification(messageForAi);
    stableTicks = 0;
    isWorking = false;
  }

  // دکمه ▶️ اجرا (Play)
  playBtn.onclick = async () => {
    setLoopState("RUNNING");
    stableTicks = 0;
    if (isWorking) return;

    // ۱. اگر پیام ارسال‌نشده‌ای در حافظه داریم یا در چت جدیدِ خالی (Continued from...) هستیم و گزارش داکر در کادر پایین هست:
    const unsentPayload = localStorage.getItem("DOCKER_BOT_UNSENT_PAYLOAD");
    const blocks = getAiCodeBlocks();

    if (unsentPayload) {
      isWorking = true;
      await sendToChatbotWithVerification(unsentPayload);
      isWorking = false;
      return;
    }

    // ۲. اگر مثل عکس شما تازه وارد چت جدید (Continued from...) شده‌ایم که هیچ کدی در آن نیست، اما آخرین گزارش داکر را در کادر پایین داریم:
    if (blocks.length === 0 && lastRawDockerOutput) {
      isWorking = true;
      const recoveryMsg = `ادامه پروژه از چت قبلی (تو به ترمینال داکر در مسیر /workspace وصل هستی).\n` + buildReplyMessageForAi(lastRawDockerOutput, 0);
      await sendToChatbotWithVerification(recoveryMsg);
      isWorking = false;
      return;
    }

    // ۳. اگر کد جدیدی در صفحه چت هست، بفرستش به داکر
    const latestCode = blocks.length > 0 ? cleanCodeText(blocks[blocks.length - 1]) : "";
    if (latestCode) {
      await runOneCycle(latestCode, blocks.length);
      return;
    }

    // ۴. اگر اولِ یک چت کاملاً جدید است و هیچ گزارش قبلی هم نداریم
    isWorking = true;
    const userInstruction = consumeNextUserBox();
    const startMsg = `تو به ترمینال لینوکس Docker من در مسیر /workspace وصل هستی.
قوانین اجباری:
1. صد در صد (100%) فقط و فقط یک بلوک کد اجرایی bash بنویس و هیچ توضیح اضافه‌ای ننویس.
2. در انتهای هر کد bash، خلاصه گزارش وضعیت را با echo چاپ کن تا در مرحله بعد که خروجی را برایت فرستادم بدانی چه کدی باید بنویسی.
${userInstruction ? `\n🎯 دستور من:\n« ${userInstruction} »` : "\nبرای شروع، یک کد bash بنویس که فایل‌های پوشه /workspace را بررسی و گزارش کند."}`;
    await sendToChatbotWithVerification(startMsg);
    isWorking = false;
  };

  pauseBtn.onclick = () => {
    setLoopState("PAUSED");
    statusEl.innerText = "⏸️ پاز شد";
  };

  stopBtn.onclick = async () => {
    setLoopState("STOPPED");
    localStorage.removeItem("DOCKER_BOT_UNSENT_PAYLOAD");
    isWorking = false;
    stableTicks = 0;
    statusEl.innerText = "⏹️ متوقف شد";
    await callServer("/kill", "POST");
  };

  // ================= ۵. حلقه پایش هوشمند و رصد موانع (هر ۱ ثانیه) =================
  timers.push(setInterval(async () => {
    checkUrlTransition();
    if (loopState !== "RUNNING" || isWorking) return;

    // مانع ۱: اگر صفحه تازه رفرش شده یا چت جدید در حال لود شدن است، صبر کن!
    if (isPageStillSettling()) {
      statusEl.innerText = "⏳ صبر برای بارگذاری صفحه...";
      return;
    }

    // مانع ۲: اگر چت‌بات در حال تایپ است، صبر کن!
    const stopGenBtn = document.querySelector('[data-testid="stop-button"], [data-testid="fruitjuice-stop-button"]');
    const isStopVisible = Boolean(stopGenBtn && stopGenBtn.offsetParent !== null);
    if (isStopVisible) {
      stableTicks = 0;
      statusEl.innerText = "✍️ چت‌بات در حال تایپ...";
      const blocks = getAiCodeBlocks();
      if (blocks.length > 0) {
        setTerminalLog(`✍️ در حال دریافت کد از چت‌بات:\n${cleanCodeText(blocks[blocks.length - 1])}`);
      }
      return;
    }

    // مانع ۳: اگر پیام Context window full در صفحه ظاهر شده، خودکار برو به چت جدید!
    if (isContextWindowFull()) {
      const unsent = localStorage.getItem("DOCKER_BOT_UNSENT_PAYLOAD") || (lastRawDockerOutput ? buildReplyMessageForAi(lastRawDockerOutput, 0) : "");
      transitionToNewChatSafely(unsent);
      return;
    }

    // مانع ۴: اگر پیام ارسال‌نشده‌ای در حافظه مانده (یا بعد از رفتن به چت جدید هنوز پیامی در چت جدید ارسال نشده است):
    const unsentPayload = localStorage.getItem("DOCKER_BOT_UNSENT_PAYLOAD");
    if (unsentPayload) {
      isWorking = true;
      await sendToChatbotWithVerification(unsentPayload);
      isWorking = false;
      return;
    }

    const blocks = getAiCodeBlocks();

    // مانع ۵: اگر در چت جدیدِ ادامه یافته (Continued from...) هستیم که هیچ کدی در آن نیست ولی گزارش داکر از چت قبلی آماده است:
    if (blocks.length === 0 && getUserMessageCountOnPage() === 0 && lastRawDockerOutput) {
      isWorking = true;
      const recoveryMsg = `ادامه پروژه از چت قبلی (تو به ترمینال داکر در مسیر /workspace وصل هستی).\n` + buildReplyMessageForAi(lastRawDockerOutput, 0);
      await sendToChatbotWithVerification(recoveryMsg);
      isWorking = false;
      return;
    }

    if (blocks.length === 0) return;

    const latestCode = cleanCodeText(blocks[blocks.length - 1]);
    if (!latestCode) return;

    const isNewCode = (blocks.length > processedBlockCount) || (latestCode !== lastExecutedCodeText);
    if (!isNewCode) {
      stableTicks = 0;
      return;
    }

    const mainEl = document.querySelector("main") || document.body;
    const currentMainLen = (mainEl.innerText || "").length;

    if (latestCode !== prevSeenCode || currentMainLen !== prevMainTextLen) {
      prevSeenCode = latestCode;
      prevMainTextLen = currentMainLen;
      stableTicks = 0;
      statusEl.innerText = "✍️ در حال تکمیل کد...";
      setTerminalLog(`✍️ دریافت کد جدید:\n${latestCode}`);
      return;
    }

    stableTicks++;
    statusEl.innerText = `⚡ ارسال به داکر (${3 - stableTicks})...`;

    if (stableTicks >= 2) {
      stableTicks = 0;
      runOneCycle(latestCode, blocks.length);
    }
  }, 1000));
})();
