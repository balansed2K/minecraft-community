document.addEventListener('DOMContentLoaded', () => {
  const authDialog = document.getElementById('authDialog');
  const authForm = document.getElementById('authForm');
  const authTitle = document.getElementById('authTitle');
  const authMessage = document.getElementById('authMessage');
  const accountButton = document.getElementById('accountButton');
  const logoutButton = document.getElementById('logoutButton');
  const registerFields = document.getElementById('registerFields');
  const loginFields = document.getElementById('loginFields');
  const authSubmit = document.getElementById('authSubmit');
  const switchToLogin = document.getElementById('switchToLogin');
  const switchToRegister = document.getElementById('switchToRegister');

  if (!authDialog || !authForm || !authTitle || !authMessage ||
      !accountButton || !logoutButton || !registerFields ||
      !loginFields || !authSubmit) {
    console.error('Ошибка: элементы авторизации не найдены.');
    return;
  }

  let supabaseClient = null;

  const configured =
    typeof SUPABASE_CONFIG !== 'undefined' &&
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.key &&
    SUPABASE_CONFIG.url.startsWith('http') &&
    !SUPABASE_CONFIG.key.startsWith('ВСТАВЬ_') &&
    !SUPABASE_CONFIG.key.startsWith('ТВОЙ_');

  if (configured && window.supabase) {
    supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.key
    );
  }

  function msg(text, error = false) {
    authMessage.textContent = text;
    authMessage.classList.toggle('error', error);
  }

  function setMode(mode) {
    const register = mode === 'register';

    authTitle.textContent = register ? 'Регистрация' : 'Вход';

    registerFields.hidden = !register;
    loginFields.hidden = register;

    authSubmit.textContent = register
      ? 'Создать аккаунт'
      : 'Войти';

    msg(
      configured
        ? ''
        : 'Регистрация пока не подключена: проверь auth-settings.js.',
      !configured
    );
  }

  function showAuth(mode = 'register') {
    authDialog.showModal();
    setMode(mode);
  }

  document.querySelectorAll('[data-auth-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      showAuth(btn.dataset.authMode);
    });
  });

  accountButton.addEventListener('click', () => {
    showAuth('register');
  });

  if (switchToLogin) {
    switchToLogin.addEventListener('click', () => {
      setMode('login');
    });
  }

  if (switchToRegister) {
    switchToRegister.addEventListener('click', () => {
      setMode('register');
    });
  }

  async function refreshAuth() {
    if (!supabaseClient) return;

    const { data } = await supabaseClient.auth.getSession();
    const session = data.session;

    if (session) {
      const username =
        session.user.user_metadata?.username || 'Мой аккаунт';

      accountButton.textContent = username;
      logoutButton.hidden = false;
    } else {
      accountButton.textContent = 'Регистрация / Вход';
      logoutButton.hidden = true;
    }
  }

  logoutButton.addEventListener('click', async () => {
    if (!supabaseClient) return;

    await supabaseClient.auth.signOut();
    await refreshAuth();
  });

  authForm.addEventListener('submit', async e => {
    e.preventDefault();

    if (!supabaseClient) {
      msg(
        'Сначала подключи Supabase в auth-settings.js.',
        true
      );
      return;
    }

    const register = !registerFields.hidden;

    authSubmit.disabled = true;

    try {
      if (register) {
        const username =
          document.getElementById('regUsername').value.trim();

        const email =
          document.getElementById('regEmail').value.trim();

        const password =
          document.getElementById('regPassword').value;

        const password2 =
          document.getElementById('regPassword2').value;

        const server =
          document.getElementById('regServer').value;

        if (!username || username.length < 3) {
          msg('Никнейм должен быть минимум 3 символа.', true);
          return;
        }

        if (password.length < 6) {
          msg('Пароль должен быть минимум 6 символов.', true);
          return;
        }

        if (password !== password2) {
          msg('Пароли не совпадают.', true);
          return;
        }

        if (!/^[1-6]$/.test(server)) {
          msg('Выбери сервер выживания от 1 до 6.', true);
          return;
        }

        const { error } =
          await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.href,
              data: {
                username,
                survival_server: Number(server)
              }
            }
          });

        if (error) {
          msg(error.message, true);
          return;
        }

        authForm.reset();

        msg(
          'Аккаунт создан. Если включено подтверждение почты, проверь email.'
        );

        await refreshAuth();

      } else {
        const email =
          document.getElementById('loginEmail').value.trim();

        const password =
          document.getElementById('loginPassword').value;

        const { error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          msg(
            'Не удалось войти. Проверь email и пароль.',
            true
          );
          return;
        }

        authForm.reset();

        msg('Вход выполнен.');

        await refreshAuth();

        setTimeout(() => {
          authDialog.close();
        }, 400);
      }

    } catch (error) {
      console.error(error);
      msg(
        'Произошла ошибка. Открой консоль браузера для подробностей.',
        true
      );
    } finally {
      authSubmit.disabled = false;
    }
  });

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(() => {
      refreshAuth();
    });
  }

  refreshAuth();
});
