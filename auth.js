const authDialog = document.getElementById('authDialog');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authMessage = document.getElementById('authMessage');
const accountButton = document.getElementById('accountButton');
const logoutButton = document.getElementById('logoutButton');
const registerFields = document.getElementById('registerFields');
const loginFields = document.getElementById('loginFields');
const authSubmit = document.getElementById('authSubmit');

let supabaseClient = null;
const configured = SUPABASE_CONFIG.url.startsWith('http') && !SUPABASE_CONFIG.key.startsWith('ВСТАВЬ_');
if (configured && window.supabase) supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

function showAuth(mode = 'register') { authDialog.showModal(); setMode(mode); }
function setMode(mode) {
  const register = mode === 'register';
  authTitle.textContent = register ? 'Регистрация' : 'Вход';
  registerFields.hidden = !register;
  loginFields.hidden = register;
  authSubmit.textContent = register ? 'Создать аккаунт' : 'Войти';
  authMessage.textContent = configured ? '' : 'Регистрация пока не подключена: сначала укажи Supabase в auth-settings.js.';
}

document.querySelectorAll('[data-auth-mode]').forEach(btn => btn.addEventListener('click', () => showAuth(btn.dataset.authMode)));
accountButton.addEventListener('click', () => showAuth('register'));
document.getElementById('switchToLogin').addEventListener('click', () => setMode('login'));
document.getElementById('switchToRegister').addEventListener('click', () => setMode('register'));
function msg(text, error = false) { authMessage.textContent = text; authMessage.classList.toggle('error', error); }

async function refreshAuth() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  const session = data.session;
  if (session) {
    const username = session.user.user_metadata?.username || 'Мой аккаунт';
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
  refreshAuth();
});

authForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabaseClient) return msg('Сначала подключи Supabase в auth-settings.js.', true);
  const register = !registerFields.hidden;
  authSubmit.disabled = true;
  try {
    if (register) {
      const username = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const password2 = document.getElementById('regPassword2').value;
      const server = document.getElementById('regServer').value;
      if (!username || username.length < 3) return msg('Никнейм должен быть минимум 3 символа.', true);
      if (password.length < 6) return msg('Пароль должен быть минимум 6 символов.', true);
      if (password !== password2) return msg('Пароли не совпадают.', true);
      if (!/^[1-6]$/.test(server)) return msg('Выбери сервер выживания от 1 до 6.', true);
      const { error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href, data: { username, survival_server: Number(server) } } });
      if (error) return msg(error.message, true);
      authForm.reset();
      msg('Аккаунт создан. Если включено подтверждение почты, проверь email.');
      await refreshAuth();
    } else {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return msg('Не удалось войти. Проверь email и пароль.', true);
      authForm.reset();
      msg('Вход выполнен.');
      await refreshAuth();
      setTimeout(() => authDialog.close(), 400);
    }
  } finally { authSubmit.disabled = false; }
});

if (supabaseClient) supabaseClient.auth.onAuthStateChange(() => refreshAuth());
refreshAuth();
