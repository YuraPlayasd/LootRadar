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

  // Валідація імені або нікнейму: літери (українські та латиниця), цифри, підкреслення, пробіли, дефіси та апострофи (2–50 символів)
  const REGEX_NAME = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ0-9_'’\s\-]{2,50}$/;
  // Гарантує наявність хоча б однієї літери або цифри (відсіює рядки на кшталт "---" або "___")
  const REGEX_NAME_HAS_WORD = /[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ0-9]/;

  // Валідація Steam-профілю (опційне поле): літери, цифри, підкреслення, дефіси або 17-значний SteamID64
  const REGEX_STEAM = /^[a-zA-Z0-9_\-]{3,64}$/;

  // ==========================================================================
  // 2. DOM-елементи форми та модального вікна
  // ==========================================================================
  let pageWrapper = null;
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
  let submitWrapper = null;
  let submitBtn = null;
  let submitBtnIcon = null;
  let submitStatusText = null;
  let submitStatusIcon = null;
  let submitStatusLabel = null;
  let successModal = null;
  let closeModalBtn = null;
  let modalOkBtn = null;
  let prefillSteamBtn = null;
  let lastFocusedBeforeModal = null;

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
    errorElement.classList.add('flex');
  }

  /**
   * Відображення стану успіху (Valid state)
   */
  function showSuccess(inputElement, errorElement) {
    if (!inputElement || !errorElement) return;

    // Оновлення Tailwind-класів рамки: встановлюємо зелений колір успішного стану
    inputElement.classList.remove('border-red-500', 'border-subtle', 'focus:border-red-500', 'focus:ring-red-500/30');
    inputElement.classList.add('border-green-500', 'focus:border-brand', 'focus:ring-brand/40');

    // Налаштування доступності (a11y)
    inputElement.setAttribute('aria-invalid', 'false');

    // Приховуємо повідомлення про помилку
    errorElement.classList.remove('flex');
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
    errorElement.classList.remove('flex');
    errorElement.classList.add('hidden');
  }

  /**
   * Оновлення живого лічильника символів повідомлення
   */
  function updateMessageCounter(len) {
    if (!currentLengthSpan) return;
    currentLengthSpan.textContent = String(len);
    if (len >= 10) {
      currentLengthSpan.classList.add('text-brand', 'font-bold');
      currentLengthSpan.classList.remove('text-slate-400', 'text-red-400');
    } else {
      currentLengthSpan.classList.remove('text-brand', 'font-bold');
      currentLengthSpan.classList.add('text-slate-400');
    }
  }

  // ==========================================================================
  // 4. Чисті перевірки правил та функції валідації для кожного поля
  // ==========================================================================

  function checkNameValue(raw) {
    const value = raw.trim();
    if (value.length === 0) {
      return { valid: false, message: "Будь ласка, вкажіть ваше ім'я або нікнейм." };
    }
    if (value.length < 2) {
      return { valid: false, message: "Ім'я або нікнейм повинен містити не менше 2 символів." };
    }
    if (value.length > 50) {
      return { valid: false, message: "Ім'я або нікнейм не повинен перевищувати 50 символів." };
    }
    if (!REGEX_NAME.test(value) || !REGEX_NAME_HAS_WORD.test(value)) {
      return { valid: false, message: "Дозволені лише літери, цифри, пробіли, дефіси, апострофи та підкреслення (_)." };
    }
    return { valid: true };
  }

  function checkEmailValue(raw) {
    const value = raw.trim();
    if (value.length === 0) {
      return { valid: false, message: "Електронна пошта є обов'язковою для отримання відповіді." };
    }
    if (!REGEX_EMAIL.test(value)) {
      return { valid: false, message: "Введіть коректну електронну адресу (наприклад: user@mail.com)." };
    }
    return { valid: true };
  }

  function checkPhoneValue(raw) {
    let normalized = raw.trim();
    if (normalized.length === 0) {
      return { valid: false, message: "Введіть номер телефону для верифікації запиту." };
    }

    const stripped = normalized.replace(/[\s\-\(\)]/g, '');
    // Edge Case: безпечна автонормалізація 0XXXXXXXXX -> +380XXXXXXXXX
    if (/^0\d{9}$/.test(stripped)) {
      normalized = '+38' + stripped;
    } else if (stripped !== normalized && /^\+380\d{9}$/.test(stripped)) {
      normalized = stripped;
    }

    if (!REGEX_PHONE.test(normalized)) {
      return { valid: false, message: "Формат має бути строго українським: +380XXXXXXXXX (рівно 9 цифр після коду)." };
    }
    return { valid: true, normalizedValue: normalized };
  }

  function checkSteamValue(raw) {
    const value = raw.trim();
    if (value.length === 0) {
      return { valid: true, isEmpty: true };
    }
    if (value.length < 3 || !REGEX_STEAM.test(value)) {
      return { valid: false, isEmpty: false, message: "Вкажіть коректний SteamID64 або Custom URL (від 3 символів без пробілів)." };
    }
    return { valid: true, isEmpty: false };
  }

  function checkMessageValue(raw) {
    const value = raw.trim();
    if (value.length === 0) {
      return { valid: false, length: 0, message: "Будь ласка, введіть текст вашого звернення." };
    }
    if (value.length < 10) {
      return { valid: false, length: value.length, message: `Повідомлення занадто коротке (зараз ${value.length} з 10 мінімальних символів).` };
    }
    return { valid: true, length: value.length };
  }

  function checkAgreementValue() {
    return { valid: Boolean(agreementCheckbox && agreementCheckbox.checked) };
  }

  /**
   * Валідація поля імені (Username / Full Name)
   */
  function validateName() {
    if (!nameInput) return true;
    const res = checkNameValue(nameInput.value);
    if (!res.valid) {
      showErr(nameInput, nameError, res.message);
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
    const res = checkEmailValue(emailInput.value);
    if (!res.valid) {
      showErr(emailInput, emailError, res.message);
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
    const res = checkPhoneValue(phoneInput.value);
    if (!res.valid) {
      showErr(phoneInput, phoneError, res.message);
      return false;
    }
    if (res.normalizedValue && res.normalizedValue !== phoneInput.value) {
      phoneInput.value = res.normalizedValue;
    }
    showSuccess(phoneInput, phoneError);
    return true;
  }

  /**
   * Валідація опційного поля Steam-профілю
   */
  function validateSteam() {
    if (!steamInput) return true;
    const res = checkSteamValue(steamInput.value);
    if (res.isEmpty) {
      clearErr(steamInput, steamError);
      return true;
    }
    if (!res.valid) {
      showErr(steamInput, steamError, res.message);
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
    const res = checkMessageValue(messageInput.value);
    updateMessageCounter(res.length);
    if (!res.valid) {
      showErr(messageInput, messageError, res.message);
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

    if (!checkAgreementValue().valid) {
      if (agreementError) {
        agreementError.classList.remove('hidden');
        agreementError.classList.add('flex');
      }
      agreementCheckbox.classList.add('ring-2', 'ring-red-500');
      agreementCheckbox.setAttribute('aria-invalid', 'true');
      return false;
    }

    if (agreementError) {
      agreementError.classList.remove('flex');
      agreementError.classList.add('hidden');
    }
    agreementCheckbox.classList.remove('ring-2', 'ring-red-500');
    agreementCheckbox.setAttribute('aria-invalid', 'false');
    return true;
  }

  /**
   * Тиха перевірка стану всіх полів для керування кнопкою «Надіслати повідомлення»
   */
  function updateSubmitButtonState() {
    if (!submitBtn) return;

    const requiredInvalid = [
      nameInput ? checkNameValue(nameInput.value).valid : true,
      emailInput ? checkEmailValue(emailInput.value).valid : true,
      phoneInput ? checkPhoneValue(phoneInput.value).valid : true,
      messageInput ? checkMessageValue(messageInput.value).valid : true,
      agreementCheckbox ? checkAgreementValue().valid : true
    ].filter(valid => !valid).length;

    const steamValid = steamInput ? checkSteamValue(steamInput.value).valid : true;
    const ready = requiredInvalid === 0 && steamValid;

    submitBtn.disabled = !ready;
    submitBtn.setAttribute('aria-disabled', ready ? 'false' : 'true');

    if (submitWrapper) {
      submitWrapper.classList.toggle('cursor-not-allowed', !ready);
    }

    if (submitBtnIcon) {
      submitBtnIcon.className = ready
        ? 'fa-solid fa-paper-plane text-xs sm:text-sm'
        : 'fa-solid fa-lock text-xs sm:text-sm';
    }

    if (submitStatusText && submitStatusIcon && submitStatusLabel) {
      if (ready) {
        submitStatusText.classList.remove('text-amber-400', 'text-red-400');
        submitStatusText.classList.add('text-brand');
        submitStatusIcon.className = 'fa-solid fa-circle-check shrink-0';
        submitStatusLabel.textContent = 'Усі поля заповнено коректно — можна надсилати';
      } else {
        submitStatusText.classList.remove('text-brand', 'text-red-400');
        submitStatusText.classList.add('text-amber-400');
        submitStatusIcon.className = 'fa-solid fa-circle-exclamation shrink-0';
        submitStatusLabel.textContent = requiredInvalid > 0
          ? `Заповніть усі обов'язкові поля (залишилось: ${requiredInvalid})`
          : 'Виправте некоректне значення Steam ID';
      }
    }
  }

  /**
   * Запускає повну перевірку полів, фокусує перше невалідне та повертає true якщо форма валідна
   */
  function validateAllFieldsAndFocus() {
    touchedFields.add('username');
    touchedFields.add('email');
    touchedFields.add('phone');
    touchedFields.add('message');

    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    const isSteamValid = validateSteam();
    const isMessageValid = validateMessage();
    const isAgreementValid = validateAgreement();

    updateSubmitButtonState();

    const allValid = isNameValid && isEmailValid && isPhoneValid && isSteamValid && isMessageValid && isAgreementValid;
    if (!allValid) {
      if (!isNameValid && nameInput) nameInput.focus();
      else if (!isEmailValid && emailInput) emailInput.focus();
      else if (!isPhoneValid && phoneInput) phoneInput.focus();
      else if (!isSteamValid && steamInput) steamInput.focus();
      else if (!isMessageValid && messageInput) messageInput.focus();
      else if (!isAgreementValid && agreementCheckbox) agreementCheckbox.focus();
    }
    return allValid;
  }

  // ==========================================================================
  // 5. Керування доступним модальним вікном успіху (Modal Dialog)
  // ==========================================================================

  function isModalOpen() {
    return Boolean(successModal && !successModal.classList.contains('hidden'));
  }

  function getModalFocusableElements() {
    if (!successModal) return [];
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(successModal.querySelectorAll(selector)).filter(el => el.offsetParent !== null);
  }

  function openSuccessModal() {
    if (!successModal) return;

    lastFocusedBeforeModal = document.activeElement;

    successModal.classList.remove('hidden');
    successModal.classList.add('flex');
    document.body.classList.add('overflow-hidden'); // Запобігаємо скролу сторінки

    if (pageWrapper) {
      pageWrapper.setAttribute('aria-hidden', 'true');
      pageWrapper.inert = true;
    }

    // Одразу переносимо фокус у модальне вікно, щоб уникнути повторного Enter на submit
    const focusTarget = modalOkBtn || closeModalBtn;
    if (focusTarget) {
      focusTarget.focus();
    }
  }

  function closeSuccessModal() {
    if (!successModal) return;

    successModal.classList.remove('flex');
    successModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');

    if (pageWrapper) {
      pageWrapper.removeAttribute('aria-hidden');
      pageWrapper.inert = false;
    }

    // Повертаємо фокус на попередній елемент або кнопку форми після закриття модалки
    const submitBtn = document.getElementById('submitFeedbackBtn');
    const returnTarget = (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function')
      ? lastFocusedBeforeModal
      : submitBtn;
    if (returnTarget) {
      returnTarget.focus();
    }
    lastFocusedBeforeModal = null;
  }

  // ==========================================================================
  // 6. Ініціалізація слухачів подій та динамічної валідації
  // ==========================================================================

  function initFeedbackForm() {
    form = document.getElementById('feedbackForm');
    if (!form) return;

    pageWrapper = document.getElementById('page-wrapper');
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
    submitWrapper = document.getElementById('submitWrapper');
    submitBtn = document.getElementById('submitFeedbackBtn');
    submitBtnIcon = document.getElementById('submitBtnIcon');
    submitStatusText = document.getElementById('submitStatusText');
    submitStatusIcon = document.getElementById('submitStatusIcon');
    submitStatusLabel = document.getElementById('submitStatusLabel');
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
            touchedFields.add('username');
            validateName();
          }
          updateSubmitButtonState();
        });
      }
    }

    // --- Динамічна валідація та реакція на нативне автозаповнення браузера ---
    function bindFieldListeners(input, fieldKey, validator, onInputExtra) {
      if (!input) return;

      input.addEventListener('blur', () => {
        touchedFields.add(fieldKey);
        validator();
        updateSubmitButtonState();
      });

      input.addEventListener('input', () => {
        if (onInputExtra) onInputExtra();
        if (touchedFields.has(fieldKey)) validator();
        updateSubmitButtonState();
      });

      input.addEventListener('change', () => {
        if (input.value.trim().length > 0 || touchedFields.has(fieldKey)) {
          touchedFields.add(fieldKey);
          validator();
        }
        updateSubmitButtonState();
      });

      input.addEventListener('animationstart', (e) => {
        if (e.animationName === 'onAutoFillStart' && input.value.trim().length > 0) {
          touchedFields.add(fieldKey);
          validator();
          updateSubmitButtonState();
        }
      });
    }

    bindFieldListeners(nameInput, 'username', validateName);
    bindFieldListeners(emailInput, 'email', validateEmail);
    bindFieldListeners(phoneInput, 'phone', validatePhone);
    bindFieldListeners(steamInput, 'steamProfile', validateSteam);

    bindFieldListeners(messageInput, 'message', validateMessage, () => {
      updateMessageCounter(messageInput.value.trim().length);
    });

    // Чекбокс
    if (agreementCheckbox) {
      agreementCheckbox.addEventListener('change', () => {
        validateAgreement();
        updateSubmitButtonState();
      });
    }

    // Клік по заблокованій зоні кнопки показує відсутні поля та акцентує індикатор
    if (submitWrapper && submitBtn) {
      submitWrapper.addEventListener('click', () => {
        if (!submitBtn.disabled) return;
        validateAllFieldsAndFocus();
        if (submitStatusText) {
          submitStatusText.classList.remove('text-amber-400');
          submitStatusText.classList.add('text-red-400');
          setTimeout(() => {
            if (submitBtn.disabled && submitStatusText) {
              submitStatusText.classList.remove('text-red-400');
              submitStatusText.classList.add('text-amber-400');
            }
          }, 1200);
        }
      });
    }

    // Початкове блокування кнопки до повного заповнення форми
    updateSubmitButtonState();

    // --- Обробка Submit форми ---
    form.addEventListener('submit', function (e) {
      e.preventDefault(); // Запобігаємо перезавантаженню сторінки

      // Захист від подвійного submit, поки модальне вікно вже відкрите
      if (isModalOpen()) return;

      if (!validateAllFieldsAndFocus()) {
        return;
      }

      // --- ІМІТАЦІЯ УСПІШНОГО НАДСИЛАННЯ НА СЕРВЕР ---
      // 1. Очищуємо форму і стани полів
      form.reset();
      clearErr(nameInput, nameError);
      clearErr(emailInput, emailError);
      clearErr(phoneInput, phoneError);
      clearErr(steamInput, steamError);
      clearErr(messageInput, messageError);
      if (agreementError) {
        agreementError.classList.remove('flex');
        agreementError.classList.add('hidden');
      }
      if (agreementCheckbox) {
        agreementCheckbox.classList.remove('ring-2', 'ring-red-500');
        agreementCheckbox.removeAttribute('aria-invalid');
      }

      updateMessageCounter(0);
      touchedFields.clear();
      updateSubmitButtonState();

      // 2. Показуємо доступне модальне вікно успіху
      openSuccessModal();
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

    // Клавіатурна доступність модального вікна: Escape та утримання фокусу на Tab / Shift+Tab
    document.addEventListener('keydown', function (e) {
      if (!isModalOpen()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeSuccessModal();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = getModalFocusableElements();
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (!successModal.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
          return;
        }

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
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

