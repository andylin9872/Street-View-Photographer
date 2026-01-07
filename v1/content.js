// content.js - Store Ready Version

// --- 1. 初始化 HTML 模板 ---
const htmlTemplate = `
<div id="sv-scout-overlay">
    <div id="sv-focal-frame">
        <div class="sv-grid g-h1"></div><div class="sv-grid g-h2"></div>
        <div class="sv-grid g-v1"></div><div class="sv-grid g-v2"></div>
        <div class="sv-frame-info" id="sv-frame-label">50mm</div>
    </div>
</div>

<button id="sv-settings-btn" title="Open Director Settings">
    <svg viewBox="0 0 24 24"><path d="M5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zM5 19h4v2H5c-1.1 0-2-.9-2-2v-4h2v4z"/></svg>
</button>

<div id="sv-ui-panel">
    <div class="sv-header">
        <h2>Street View Photographer</h2>
        <span id="sv-close-panel" title="Close Panel">✕</span>
    </div>

    <div class="sv-switch-row">
        <span class="sv-switch-label">Show Frame</span>
        <label class="sv-switch">
            <input type="checkbox" id="sv-frame-toggle">
            <span class="slider"></span>
        </label>
    </div>
    
    <div class="sv-section">
        <div class="sv-label">
            <span>Focal Length (mm)</span>
            <input type="number" id="sv-focal-input" class="sv-num-input" value="50" min="10" max="999">
        </div>
        <input type="range" id="sv-focal-slider" min="12" max="200" value="50">
        <div class="sv-btn-row">
            <button data-f="24">24</button>
            <button data-f="35">35</button>
            <button data-f="50" class="active">50</button>
            <button data-f="85">85</button>
        </div>
    </div>

    <div class="sv-section">
        <span class="sv-label">Aspect Ratio</span>
        <select id="sv-aspect-select">
            <optgroup label="Horizontal">
                <option value="1.5" selected>3:2 (Full Frame)</option>
                <option value="1.777">16:9 (Cinema/HD)</option>
                <option value="2.39">2.39:1 (Anamorphic)</option>
                <option value="1.333">4:3 (TV)</option>
            </optgroup>
            <optgroup label="Square">
                <option value="1">1:1 (Square)</option>
            </optgroup>
            <optgroup label="Vertical">
                <option value="0.8">4:5 (Social Portrait)</option>
                <option value="0.6666">2:3 (Vertical Photo)</option>
                <option value="0.5625">9:16 (Stories/Reels)</option>
            </optgroup>
        </select>
    </div>

    <div class="sv-section">
        <span class="sv-label">Sensor Size</span>
        <select id="sv-sensor-select">
            <option value="36">Full Frame (36mm)</option>
            <option value="24">APS-C Standard (~24mm)</option>
            <option value="22.3">Canon APS-C (1.6x)</option>
            <option value="17.3">Micro 4/3 (17.3mm)</option>
        </select>
    </div>
    
    <div id="sv-fov-debug">Waiting for Street View...</div>
</div>
`;

// 注入 UI
const div = document.createElement('div');
div.innerHTML = htmlTemplate;
document.body.appendChild(div);

// --- 2. 狀態管理 ---
const state = {
    frameVisible: false,
    panelVisible: false,
    focalLength: 50,
    sensorWidth: 36,
    aspectRatio: 1.5,
    mapFOV: 75
};

// --- 3. DOM 元素快取 ---
const els = {
    frame: document.getElementById('sv-focal-frame'),
    panel: document.getElementById('sv-ui-panel'),
    settingsBtn: document.getElementById('sv-settings-btn'),
    closePanelBtn: document.getElementById('sv-close-panel'),
    frameToggle: document.getElementById('sv-frame-toggle'),
    slider: document.getElementById('sv-focal-slider'),
    input: document.getElementById('sv-focal-input'),
    label: document.getElementById('sv-frame-label'),
    aspect: document.getElementById('sv-aspect-select'),
    sensor: document.getElementById('sv-sensor-select'),
    debug: document.getElementById('sv-fov-debug'),
    focalBtns: document.querySelectorAll('#sv-ui-panel button[data-f]')
};

// --- 4. 輔助函式 ---
function getMapFOVFromURL() {
    // 街景 URL 格式範例: ...3a,75y... 或 ...3a,90.5y...
    const url = window.location.href;
    const match = url.match(/,(\d+(\.\d+)?)y/);
    return (match && match[1]) ? parseFloat(match[1]) : null;
}

// --- 5. 核心邏輯 (高度鎖定演算法) ---
function updateFrame() {
    if (!state.frameVisible) {
        els.frame.style.display = 'none';
        return;
    }

    const currentMapFOV = getMapFOVFromURL();

    if (!currentMapFOV) {
        els.frame.style.display = 'none';
        els.debug.innerText = "Street View inactive";
        return;
    }

    state.mapFOV = currentMapFOV;
    els.frame.style.display = 'block';

    // A. 計算鏡頭垂直視角
    const sensorHeight = state.sensorWidth / state.aspectRatio;
    const lensVFovRad = 2 * Math.atan(sensorHeight / (2 * state.focalLength));

    // B. 推算地圖垂直視角 (假設網址 FOV 基於 16:9 寬屏)
    const refAspect = 16 / 9;
    const mapHFovRad = state.mapFOV * (Math.PI / 180);
    const mapVFovRad = 2 * Math.atan(Math.tan(mapHFovRad / 2) / refAspect);

    // C. 計算縮放比例 (微調係數 0.95)
    const correctionFactor = 0.35;
    const heightScale = (Math.tan(lensVFovRad / 2) / Math.tan(mapVFovRad / 2)) * correctionFactor;

    // D. 應用尺寸 (基於視窗高度)
    const frameHeightPx = window.innerHeight * heightScale;
    const frameWidthPx = frameHeightPx * state.aspectRatio;

    els.frame.style.width = `${frameWidthPx}px`;
    els.frame.style.height = `${frameHeightPx}px`;
    els.label.innerText = `${state.focalLength}mm`;
    els.debug.innerText = `Map FOV: ${state.mapFOV.toFixed(1)}°`;

    // E. 邊界檢查 (變紅警告)
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (frameWidthPx > w * 1.05 || frameHeightPx > h * 1.05) {
        els.frame.style.borderColor = 'rgba(255, 80, 80, 0.8)';
    } else {
        els.frame.style.borderColor = 'rgba(255, 255, 255, 0.95)';
    }
}

// --- 6. UI 事件綁定 ---

// 切換面板
els.settingsBtn.addEventListener('click', () => {
    state.panelVisible = !state.panelVisible;
    els.panel.style.display = state.panelVisible ? 'block' : 'none';
    els.settingsBtn.classList.toggle('active', state.panelVisible);

    // 首次開啟自動顯示框線
    if (state.panelVisible && !state.frameVisible) {
        state.frameVisible = true;
        els.frameToggle.checked = true;
    }
});

// 關閉面板
els.closePanelBtn.addEventListener('click', () => {
    state.panelVisible = false;
    els.panel.style.display = 'none';
    els.settingsBtn.classList.remove('active');
});

// 切換框線顯示
els.frameToggle.addEventListener('change', (e) => {
    state.frameVisible = e.target.checked;
    updateFrame();
});

// 焦距控制: 滑桿
els.slider.addEventListener('input', (e) => {
    state.focalLength = parseInt(e.target.value);
    updateUI();
});

// 焦距控制: 輸入框
els.input.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (val && val > 0) {
        state.focalLength = val;
        els.slider.value = val;
        updateButtonsHighlight();
    }
});

// 焦距控制: 快速按鈕
els.focalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.focalLength = parseInt(btn.dataset.f);
        updateUI();
    });
});

// 其他下拉選單
els.aspect.addEventListener('change', (e) => state.aspectRatio = parseFloat(e.target.value));
els.sensor.addEventListener('change', (e) => state.sensorWidth = parseFloat(e.target.value));

// UI 同步函式
function updateUI() {
    els.slider.value = state.focalLength;
    els.input.value = state.focalLength;
    updateButtonsHighlight();
}

function updateButtonsHighlight() {
    els.focalBtns.forEach(b => {
        if (parseInt(b.dataset.f) === state.focalLength) b.classList.add('active');
        else b.classList.remove('active');
    });
}

// --- 7. 啟動迴圈 ---
function loop() {
    updateFrame();
    requestAnimationFrame(loop);
}

// 確保 DOM 載入後執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loop);
} else {
    loop();
}