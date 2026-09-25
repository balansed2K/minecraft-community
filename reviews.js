document.addEventListener('DOMContentLoaded', () => {
  const reviewDialog = document.getElementById('reviewDialog');
  const reviewForm = document.getElementById('reviewForm');
  const reviewOpen = document.getElementById('reviewOpen');
  const reviewsGrid = document.getElementById('reviewsGrid');
  const reviewMessage = document.getElementById('reviewMessage');
  const reviewRating = document.getElementById('reviewRating');
  const reviewText = document.getElementById('reviewText');
  const reviewFiles = document.getElementById('reviewFiles');

  if (!reviewDialog || !reviewForm || !reviewOpen || !reviewsGrid) {
    console.error('Ошибка: элементы отзывов не найдены.');
    return;
  }

  const configured =
    typeof SUPABASE_CONFIG !== 'undefined' &&
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.key &&
    SUPABASE_CONFIG.url.startsWith('http') &&
    !SUPABASE_CONFIG.key.startsWith('ВСТАВЬ_') &&
    !SUPABASE_CONFIG.key.startsWith('ТВОЙ_');

  let supabaseClient = null;

  if (configured && window.supabase) {
    supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.key
    );
  }

  function setMsg(text, error = false) {
    if (!reviewMessage) return;
    reviewMessage.textContent = text;
    reviewMessage.classList.toggle('error', error);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderStars(rating) {
    const full = '★'.repeat(rating);
    const empty = '☆'.repeat(5 - rating);
    return full + empty;
  }

  function renderReviews(reviews) {
    if (!reviews || reviews.length === 0) {
      reviewsGrid.innerHTML =
        '<p class="muted reviewsEmpty">Пока нет отзывов. Будь первым!</p>';
      return;
    }

    reviewsGrid.innerHTML = reviews
      .map(review => {
        const date = new Date(review.created_at).toLocaleDateString('ru-RU');

        const imagesHtml = (review.images || [])
          .map(
            url =>
              `<img src="${url}" alt="Скриншот отзыва" loading="lazy" style="width:100%;border-radius:8px;margin-top:8px;">`
          )
          .join('');

        return `
          <article class="reviewCard" style="padding:16px;border-radius:12px;background:rgba(255,255,255,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <b>${escapeHtml(review.username)}</b>
              <small class="muted">${date}</small>
            </div>
            <div style="color:#ffd166;margin:4px 0;">${renderStars(review.rating)}</div>
            <p>${escapeHtml(review.review_text)}</p>
            ${imagesHtml}
          </article>
        `;
      })
      .join('');
  }

  async function loadReviews() {
    if (!supabaseClient) {
      reviewsGrid.innerHTML =
        '<p class="muted reviewsEmpty">Отзывы не подключены: проверь auth-settings.js.</p>';
      return;
    }

    const { data, error } = await supabaseClient
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      reviewsGrid.innerHTML =
        '<p class="muted reviewsEmpty">Не удалось загрузить отзывы.</p>';
      return;
    }

    renderReviews(data);
  }

  reviewOpen.addEventListener('click', async () => {
    if (!supabaseClient) {
      setMsg('Отзывы не подключены: проверь auth-settings.js.', true);
      reviewDialog.showModal();
      return;
    }

    const { data } = await supabaseClient.auth.getSession();

    if (!data.session) {
      alert('Сначала войди в аккаунт, чтобы оставить отзыв.');
      const authDialog = document.getElementById('authDialog');
      if (authDialog) authDialog.showModal();
      return;
    }

    setMsg('Отзыв публикуется от имени твоего аккаунта.');
    reviewForm.reset();
    reviewDialog.showModal();
  });

  reviewForm.addEventListener('submit', async e => {
    e.preventDefault();

    if (!supabaseClient) {
      setMsg('Сначала подключи Supabase в auth-settings.js.', true);
      return;
    }

    const submitBtn = reviewForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        setMsg('Сначала войди в аккаунт.', true);
        return;
      }

      const rating = Number(reviewRating.value);
      const text = reviewText.value.trim();
      const files = reviewFiles.files ? Array.from(reviewFiles.files) : [];

      if (!text) {
        setMsg('Напиши текст отзыва.', true);
        return;
      }

      if (files.length > 3) {
        setMsg('Можно загрузить не больше 3 файлов.', true);
        return;
      }

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          setMsg(`Файл "${file.name}" больше 5 МБ.`, true);
          return;
        }
      }

      const imageUrls = [];

      for (const file of files) {
        const path = `${session.user.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('review-images')
          .upload(path, file);

        if (uploadError) {
          setMsg(`Не удалось загрузить файл "${file.name}".`, true);
          return;
        }

        const { data: publicUrlData } = supabaseClient.storage
          .from('review-images')
          .getPublicUrl(path);

        imageUrls.push(publicUrlData.publicUrl);
      }

      const username =
        session.user.user_metadata?.username || 'Игрок';

      const { error: insertError } = await supabaseClient
        .from('reviews')
        .insert({
          user_id: session.user.id,
          username,
          rating,
          review_text: text,
          images: imageUrls
        });

      if (insertError) {
        setMsg(insertError.message, true);
        return;
      }

      setMsg('Спасибо! Отзыв опубликован.');
      reviewForm.reset();
      await loadReviews();

      setTimeout(() => {
        reviewDialog.close();
      }, 600);

    } catch (error) {
      console.error(error);
      setMsg('Произошла ошибка. Открой консоль браузера для подробностей.', true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  loadReviews();
});
