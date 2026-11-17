/**
 * LootRadar — Клієнтська валідація форми зворотного зв'язку
 * Лабораторна робота № 9: «Адаптивні форми зворотного зв'язку та клієнтська валідація»
 * Стек: Vanilla JavaScript + Tailwind CSS + HTML5 Accessibility (a11y)
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. Регулярні вирази (RegEx) та конфігурація валідації
  // ==========================================================================

  // Стандартна структура електронної пошти: ім'я користувача, @, домен, TLD (мін. 2 символи)
  const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Строго український формат телефону: +380 та рівно 9 цифр після коду країни
  const REGEX_PHONE = /^\+380\d{9}$/;

  // Валідація імені: літери (українські та латиниця), пробіли, дефіси та апострофи (від 2 до 50 символів)
  const REGEX_NAME = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ'’\s\-]{2,50}$/;

  // Валідація Steam-профілю (опційне поле): літери, цифри, підкреслення, дефіси або 17-значний SteamID64
  const REGEX_STEAM = /^[a-zA-Z0-9_\-]{3,64}$/;

  // ==========================================================================
  // 2. DOM-елементи форми та модального вікна
  // ==========================================================================
  let form = null;
  let nameInput = null;
  let nameError = null;
  let emailInput = null;
  let emailError = null;
  let phoneInput = null;
  let phoneError = null;
  let steamInput = null;
  let steamError = null;
  let topicSelect = null;
  let messageInput = null;
  let messageError = null;
  let messageCounter = null;
  let currentLengthSpan = null;
  let agreementCheckbox = null;
  let agreementError = null;
  let successModal = null;
  let closeModalBtn = null;
  let modalOkBtn = null;
  let prefillSteamBtn = null;

  // Відстеження полів, з якими користувач вже взаємодіяв (touched)
  const touchedFields = new Set();

  // ==========================================================================
  // 3. Допоміжні UI-функції відображення станів (Default / Invalid / Valid)
  // ==========================================================================

  /**
   * Відображення стану помилки (Invalid state)
   */
  function showErr(inputElement, errorElement, message) {
    if (!inputElement || !errorElement) return;

    // Оновлення Tailwind-класів рамки: видаляємо зелені/нейтральні, додаємо червоні
    inputElement.classList.remove('border-brand', 'border-green-500', 'border-subtle', 'focus:border-brand', 'focus:ring-brand/40');
    inputElement.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/30');

    // Налаштування доступності (a11y)
    inputElement.setAttribute('aria-invalid', 'true');

    // Текст помилки та видимість
    const msgSpan = errorElement.querySelector('span');
    if (msgSpan) {
      msgSpan.textContent = message;
    } else {
      errorElement.textContent = message;
    }
    errorElement.classList.remove('hidden');
  }

  /**
   * Відображення стану успіху (Valid state)
   */
  function showSuccess(inputElement, errorElement) {
    if (!inputElement || !errorElement) return;

    // Оновлення Tailwind-класів рамки: встановлюємо брендовий зелений колір
    inputElement.classList.remove('border-red-500', 'border-subtle', 'focus:border-red-500', 'focus:ring-red-500/30');
    inputElement.classList.add('border-brand', 'border-green-500', 'focus:border-brand', 'focus:ring-brand/40');

    // Налаштування доступності (a11y)
    inputElement.setAttribute('aria-invalid', 'false');

    // Приховуємо повідомлення про помилку
    errorElement.classList.add('hidden');
  }

  /**
   * Скидання поля до початкового нейтрального стану (Neutral state)
   */
  function clearErr(inputElement, errorElement) {
    if (!inputElement || !errorElement) return;

    inputElement.classList.remove('border-red-500', 'border-brand', 'border-green-500', 'focus:border-red-500', 'focus:ring-red-500/30');
    inputElement.classList.add('border-subtle', 'focus:border-brand', 'focus:ring-brand/40');

    inputElement.removeAttribute('aria-invalid');
    errorElement.classList.add('hidden');
  }

  // ==========================================================================
  // 4. Окремі функції валідації для кожного поля
  // ==========================================================================

  /**
   * Валідація поля імені (Username / Full Name)
   */
  function validateName() {
    if (!nameInput) return true;
    const value = nameInput.value.trim();

    // Граничний випадок: порожнє поле або менше 2 символів
    if (value.length === 0) {
      showErr(nameInput, nameError, "Будь ласка, вкажіть ваше ім'я або нікнейм.");
      return false;
    }
    if (value.length < 2) {
      showErr(nameInput, nameError, "Ім'я повинно містити не менше 2 символів.");
      return false;
    }
    // Граничний випадок: наявність недопустимих спецсимволів або цифр
    if (!REGEX_NAME.test(value)) {
      showErr(nameInput, nameError, "Ім'я може містити лише літери, дефіси, апострофи та пробіли.");
      return false;
    }

    showSuccess(nameInput, nameError);
    return true;
  }

  /**
   * Валідація поля електронної пошти (Email)
   */
  function validateEmail() {
    if (!emailInput) return true;
    const value = emailInput.value.trim();

    if (value.length === 0) {
      showErr(emailInput, emailError, "Електронна пошта є обов'язковою для отримання відповіді.");
      return false;
    }
    // Перевірка формату регулярним виразом
    if (!REGEX_EMAIL.test(value)) {
      showErr(emailInput, emailError, "Введіть коректну електронну адресу (наприклад: user@mail.com).");
      return false;
    }

    showSuccess(emailInput, emailError);
    return true;
  }

  /**
   * Валідація та обробка граничних випадків (Edge Cases) для номера телефону
   */
  function validatePhone() {
    if (!phoneInput) return true;
    let rawValue = phoneInput.value.trim();

    if (rawValue.length === 0) {
      showErr(phoneInput, phoneError, "Введіть номер телефону для верифікації запиту.");
      return false;
    }

    // Edge Case: якщо користувач почав вводити з 0 (наприклад, 0501234567)
    // Безпечна автонормалізація: автоматично додаємо префікс +38
    if (/^0\d{9}$/.test(rawValue.replace(/[\s\-\(\)]/g, ''))) {
      rawValue = '+38' + rawValue.replace(/[\s\-\(\)]/g, '');
      phoneInput.value = rawValue;
    }

    // Edge Case: очищення випадкових пробілів, дужок або дефісів при копіюванні
    const sanitized = rawValue.replace(/[\s\-\(\)]/g, '');
    if (sanitized !== rawValue && /^\+380\d{9}$/.test(sanitized)) {
      phoneInput.value = sanitized;
      rawValue = sanitized;
    }

    // Перевірка строго за правилом +380XXXXXXXXX
    if (!REGEX_PHONE.test(rawValue)) {
      showErr(phoneInput, phoneError, "Формат має бути строго українським: +380XXXXXXXXX (рівно 9 цифр після коду).");
      return false;
    }

    showSuccess(phoneInput, phoneError);
    return true;
  }

  /**
   * Валідація опційного поля Steam-профілю
   */
  function validateSteam() {
    if (!steamInput) return true;
    const value = steamInput.value.trim();

    // Поле опційне — якщо порожнє, це валідний стан
    if (value.length === 0) {
      clearErr(steamInput, steamError);
      return true;
    }

    // Якщо заповнено — перевіряємо формат нікнейму чи SteamID
    if (value.length < 3 || !REGEX_STEAM.test(value)) {
      showErr(steamInput, steamError, "Вкажіть коректний SteamID64 або Custom URL (від 3 символів без пробілів).");
      return false;
    }

    showSuccess(steamInput, steamError);
    return true;
  }

  /**
   * Валідація тексту повідомлення (Textarea)
   */
  function validateMessage() {
    if (!messageInput) return true;
    const value = messageInput.value.trim();

    // Оновлення живого лічильника символів
    if (currentLengthSpan) {
      currentLengthSpan.textContent = value.length;
      if (value.length >= 10) {
        currentLengthSpan.classList.add('text-brand', 'font-bold');
        currentLengthSpan.classList.remove('text-slate-400', 'text-red-400');
      } else {
        currentLengthSpan.classList.remove('text-brand', 'font-bold');
        currentLengthSpan.classList.add('text-slate-400');
      }
    }

    if (value.length === 0) {
      showErr(messageInput, messageError, "Будь ласка, введіть текст вашого звернення.");
      return false;
    }
    if (value.length < 10) {
      showErr(messageInput, messageError, `Повідомлення занадто коротке (зараз ${value.length} з 10 мінімальних символів).`);
      return false;
    }

    showSuccess(messageInput, messageError);
    return true;
  }

  /**
   * Валідація чекбоксу згоди з політикою конфіденційності
   */
  function validateAgreement() {
    if (!agreementCheckbox) return true;

    if (!agreementCheckbox.checked) {
      if (agreementError) {
        agreementError.classList.remove('hidden');
      }
      agreementCheckbox.classList.add('ring-2', 'ring-red-500');
      agreementCheckbox.setAttribute('aria-invalid', 'true');
      return false;
    }

    if (agreementError) {
      agreementError.classList.add('hidden');
    }
    agreementCheckbox.classList.remove('ring-2', 'ring-red-500');
    agreementCheckbox.setAttribute('aria-invalid', 'false');
    return true;
  }

  // ==========================================================================
  // 5. Керування доступним модальним вікном успіху (Modal Dialog)
  // ==========================================================================

  function openSuccessModal() {
    if (!successModal) return;

    successModal.classList.remove('hidden');
    successModal.classList.add('flex');
    document.body.classList.add('overflow-hidden'); // Запобігаємо скролу сторінки

    // Встановлюємо фокус на кнопку закриття для доступності екранних дикторів
    if (modalOkBtn) {
      setTimeout(() => modalOkBtn.focus(), 50);
    } else if (closeModalBtn) {
      setTimeout(() => closeModalBtn.focus(), 50);
    }
  }

  function closeSuccessModal() {
    if (!successModal) return;

    successModal.classList.remove('flex');
    successModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');

    // Повертаємо фокус на кнопку форми після закриття модалки
    const submitBtn = document.getElementById('submitFeedbackBtn');
    if (submitBtn) {
      submitBtn.focus();
    }
  }

  // ==========================================================================
  // 6. Ініціалізація слухачів подій та динамічної валідації
  // ==========================================================================

  function initFeedbackForm() {
    form = document.getElementById('feedbackForm');
    if (!form) return;

    nameInput = document.getElementById('username');
    nameError = document.getElementById('nameError');
    emailInput = document.getElementById('email');
    emailError = document.getElementById('emailError');
    phoneInput = document.getElementById('phone');
    phoneError = document.getElementById('phoneError');
    steamInput = document.getElementById('steamProfile');
    steamError = document.getElementById('steamProfileError');
    topicSelect = document.getElementById('topic');
    messageInput = document.getElementById('message');
    messageError = document.getElementById('messageError');
    messageCounter = document.getElementById('messageCounter');
    currentLengthSpan = document.getElementById('currentLength');
    agreementCheckbox = document.getElementById('agreement');
    agreementError = document.getElementById('agreementError');
    successModal = document.getElementById('successModal');
    closeModalBtn = document.getElementById('closeSuccessModalBtn');
    modalOkBtn = document.getElementById('modalOkBtn');
    prefillSteamBtn = document.getElementById('prefillSteamBtn');

    // Автоматичне підставлення даних, якщо користувач авторизований у LootRadar
    if (typeof LootRadar !== 'undefined' && LootRadar.auth && LootRadar.auth.isLoggedIn()) {
      const user = LootRadar.auth.getUser();
      if (user && prefillSteamBtn) {
        prefillSteamBtn.classList.remove('hidden');
        prefillSteamBtn.addEventListener('click', function () {
          if (steamInput) {
            steamInput.value = user.personaName || user.steamId;
            validateSteam();
          }
          if (nameInput && !nameInput.value.trim()) {
            nameInput.value = user.personaName;
            validateName();
          }
        });
      }
    }

    // --- Динамічна валідація на подіях blur (вивантаження фокусу) та input (введення) ---

    // Ім'я
    if (nameInput) {
      nameInput.addEventListener('blur', () => {
        touchedFields.add('username');
        validateName();
      });
      nameInput.addEventListener('input', () => {
        if (touchedFields.has('username')) validateName();
      });
    }

    // Email
    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        touchedFields.add('email');
        validateEmail();
      });
      emailInput.addEventListener('input', () => {
        if (touchedFields.has('email')) validateEmail();
      });
    }

    // Телефон
    if (phoneInput) {
      phoneInput.addEventListener('blur', () => {
        touchedFields.add('phone');
        validatePhone();
      });
      phoneInput.addEventListener('input', () => {
        if (touchedFields.has('phone')) validatePhone();
      });
    }

    // Steam-профіль (опційне)
    if (steamInput) {
      steamInput.addEventListener('blur', () => {
        if (steamInput.value.trim()) validateSteam();
      });
      steamInput.addEventListener('input', () => {
        if (steamInput.value.trim()) validateSteam();
        else clearErr(steamInput, steamError);
      });
    }

    // Повідомлення
    if (messageInput) {
      messageInput.addEventListener('blur', () => {
        touchedFields.add('message');
        validateMessage();
      });
      messageInput.addEventListener('input', () => {
        // Лічильник оновлюється завжди при введенні
        const len = messageInput.value.trim().length;
        if (currentLengthSpan) currentLengthSpan.textContent = len;
        if (touchedFields.has('message')) validateMessage();
      });
    }

    // Чекбокс
    if (agreementCheckbox) {
      agreementCheckbox.addEventListener('change', () => {
        validateAgreement();
      });
    }

    // --- Обробка Submit форми ---
    form.addEventListener('submit', function (e) {
      e.preventDefault(); // Запобігаємо перезавантаженню сторінки

      // Позначаємо всі поля як опрацьовані
      touchedFields.add('username');
      touchedFields.add('email');
      touchedFields.add('phone');
      touchedFields.add('message');

      // Тотальна перевірка кожного поля
      const isNameValid = validateName();
      const isEmailValid = validateEmail();
      const isPhoneValid = validatePhone();
      const isSteamValid = validateSteam();
      const isMessageValid = validateMessage();
      const isAgreementValid = validateAgreement();

      const allValid = isNameValid && isEmailValid && isPhoneValid && isSteamValid && isMessageValid && isAgreementValid;

      if (!allValid) {
        // Фокусуємо перше невалідне поле для зручності та a11y
        if (!isNameValid && nameInput) nameInput.focus();
        else if (!isEmailValid && emailInput) emailInput.focus();
        else if (!isPhoneValid && phoneInput) phoneInput.focus();
        else if (!isSteamValid && steamInput) steamInput.focus();
        else if (!isMessageValid && messageInput) messageInput.focus();
        else if (!isAgreementValid && agreementCheckbox) agreementCheckbox.focus();
        return;
      }

      // --- ІМІТАЦІЯ УСПІШНОГО НАДСИЛАННЯ НА СЕРВЕР ---
      // 1. Показуємо модальне вікно успіху
      openSuccessModal();

      // 2. Очищуємо форму
      form.reset();

      // 3. Скидаємо стилі зелених/червоних рамок до початкових нейтральних
      clearErr(nameInput, nameError);
      clearErr(emailInput, emailError);
      clearErr(phoneInput, phoneError);
      clearErr(steamInput, steamError);
      clearErr(messageInput, messageError);
      if (agreementError) agreementError.classList.add('hidden');
      if (agreementCheckbox) agreementCheckbox.classList.remove('ring-2', 'ring-red-500');

      if (currentLengthSpan) currentLengthSpan.textContent = '0';
      touchedFields.clear();
    });

    // --- Керування закриттям модального вікна ---
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeSuccessModal);
    }
    if (modalOkBtn) {
      modalOkBtn.addEventListener('click', closeSuccessModal);
    }

    // Закриття при кліку на затемнений оверлей (фон), але не всередині картки
    if (successModal) {
      successModal.addEventListener('click', function (e) {
        if (e.target === successModal) {
          closeSuccessModal();
        }
      });
    }

    // Закриття модального вікна клавішею Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && successModal && !successModal.classList.contains('hidden')) {
        closeSuccessModal();
      }
    });
  }

  // Запуск після завантаження DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedbackForm);
  } else {
    initFeedbackForm();
  }
})();

