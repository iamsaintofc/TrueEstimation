import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://szmwwykgtwdosauounds.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_O4raj-GlUeg3p8E62TQ_X3gpfZER'; 

const supabase = createClient(supabaseUrl, supabaseKey);

const globalAudio = new Audio();
let currentTrackId = null;
let allTracksData = []; 
let allCommentsData = []; 
let currentCategory = 'Главное меню';
let ratingTrackId = null;
let currentUserRating = null;
let previousVolume = 1;
let currentUserId = null;

let isShuffle = false;
let repeatMode = 0; 
let currentSort = 'rating';

// Переменные для кастомного подтверждения
let confirmCallback = null;

// --- ХЕЛПЕРЫ ---
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const borderColor = type === 'success' ? 'border-green-500' : 'border-red-500';
    const textColor = type === 'success' ? 'text-green-400' : 'text-red-400';
    const icon = type === 'success' 
        ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
        : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;

    toast.className = `bg-gray-800 text-white px-6 py-3 rounded-xl shadow-2xl border-l-4 ${borderColor} flex items-center gap-3 transition-all duration-300 translate-y-[-20px] opacity-0 pointer-events-auto`;
    toast.innerHTML = `<div class="${textColor}">${icon}</div><span class="font-medium text-sm">${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-[-20px]', 'opacity-0'), 10);
    setTimeout(() => { toast.classList.add('translate-y-[-20px]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- КАСТОМНЫЙ CONFIRM ---
window.showConfirm = function(text, callback) {
    document.getElementById('confirm-text').innerText = text;
    confirmCallback = callback;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

window.closeConfirmModal = function() {
    document.getElementById('confirm-modal').classList.add('hidden');
    confirmCallback = null;
}

window.executeConfirm = async function() {
    if (confirmCallback) await confirmCallback();
    closeConfirmModal();
}

// --- АВТОРИЗАЦИЯ ---
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUserId = session.user.id;
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-email-display').innerText = session.user.email;
        document.getElementById('user-avatar-letter').innerText = session.user.email.charAt(0).toUpperCase();
    } else {
        currentUserId = null;
        document.getElementById('login-btn').classList.remove('hidden');
        document.getElementById('user-profile').classList.add('hidden');
    }
});

window.openLoginModal = () => document.getElementById('login-modal').classList.remove('hidden');
window.closeLoginModal = () => document.getElementById('login-modal').classList.add('hidden');

window.handleLogin = async function() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if(!email || !password) return showToast("Введи email и пароль!", "error");
    
    let { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && error.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) showToast('Ошибка: ' + signUpError.message, 'error');
        else { showToast('Аккаунт создан! Вы вошли.', 'success'); closeLoginModal(); }
    } else if (error) {
        showToast('Ошибка: ' + error.message, 'error');
    } else {
        showToast('Успешный вход!', 'success'); closeLoginModal();
    }
}

window.logout = async function() { 
    await supabase.auth.signOut(); 
    showToast('Вы вышли из аккаунта', 'success');
}

// --- ПЛЕЕР ---
window.playTrack = function(trackId) {
    const track = allTracksData.find(t => t.id === trackId);
    if (!track) return;
    if (currentTrackId === trackId) { toggleGlobalPlay(); return; }

    currentTrackId = trackId;
    globalAudio.src = track.audio_url;
    globalAudio.play();

    document.getElementById('global-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist ? track.artist : 'TrueEstimation';
    
    const coverImg = document.getElementById('player-cover');
    if(track.cover_url) { coverImg.src = track.cover_url; coverImg.style.display = 'block'; } 
    else { coverImg.style.display = 'none'; }

    updateAllPlayIcons();
    updateGlobalPlayPauseIcon(true);
}

window.toggleGlobalPlay = function() {
    if (!currentTrackId) return;
    if (globalAudio.paused) { globalAudio.play(); updateGlobalPlayPauseIcon(true); } 
    else { globalAudio.pause(); updateGlobalPlayPauseIcon(false); }
    updateAllPlayIcons();
}

window.playNext = function() {
    if (!currentTrackId || allTracksData.length === 0) return;
    if (repeatMode === 2) { globalAudio.currentTime = 0; globalAudio.play(); return; }
    let nextIndex;
    if (isShuffle) { nextIndex = Math.floor(Math.random() * allTracksData.length); } 
    else {
        const currentIndex = allTracksData.findIndex(t => t.id === currentTrackId);
        nextIndex = currentIndex + 1;
        if (nextIndex >= allTracksData.length) {
            if (repeatMode === 1) nextIndex = 0;
            else { globalAudio.pause(); updateGlobalPlayPauseIcon(false); updateAllPlayIcons(); return; }
        }
    }
    playTrack(allTracksData[nextIndex].id);
}

window.playPrev = function() {
    if (!currentTrackId || allTracksData.length === 0) return;
    if (repeatMode === 2) { globalAudio.currentTime = 0; globalAudio.play(); return; }
    let prevIndex;
    if (isShuffle) { prevIndex = Math.floor(Math.random() * allTracksData.length); } 
    else {
        const currentIndex = allTracksData.findIndex(t => t.id === currentTrackId);
        prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            if (repeatMode === 1) prevIndex = allTracksData.length - 1;
            else prevIndex = 0;
        }
    }
    playTrack(allTracksData[prevIndex].id);
}

window.toggleShuffle = function() {
    isShuffle = !isShuffle;
    const btn = document.getElementById('shuffle-btn');
    if (isShuffle) { btn.classList.add('text-green-500'); btn.classList.remove('text-gray-400'); showToast('Перемешивание включено', 'success'); } 
    else { btn.classList.remove('text-green-500'); btn.classList.add('text-gray-400'); showToast('Перемешивание выключено', 'success'); }
}

window.toggleRepeat = function() {
    repeatMode = (repeatMode + 1) % 3;
    const btn = document.getElementById('repeat-btn');
    const badge = document.getElementById('repeat-badge');
    btn.classList.remove('text-green-500', 'text-gray-400'); badge.classList.add('hidden');
    if (repeatMode === 0) { btn.classList.add('text-gray-400'); showToast('Повтор выключен', 'success'); } 
    else if (repeatMode === 1) { btn.classList.add('text-green-500'); showToast('Повтор всех треков', 'success'); } 
    else if (repeatMode === 2) { btn.classList.add('text-green-500'); badge.classList.remove('hidden'); showToast('Повтор текущего трека', 'success'); }
}

window.openCoverModal = function() {
    if (!currentTrackId) return;
    const track = allTracksData.find(t => t.id === currentTrackId);
    if (!track || !track.cover_url) return;
    document.getElementById('cover-modal-img').src = track.cover_url;
    document.getElementById('cover-modal').classList.remove('hidden');
}
window.closeCoverModal = () => document.getElementById('cover-modal').classList.add('hidden');

function updateAllPlayIcons() {
    document.querySelectorAll('.card-play-icon').forEach(icon => { icon.innerHTML = `<path class="ml-0.5" d="M8 5v14l11-7z"/>`; });
    if (currentTrackId && !globalAudio.paused) {
        document.querySelectorAll(`.card-icon-${currentTrackId}`).forEach(icon => { icon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; });
    }
}

function updateGlobalPlayPauseIcon(isPlaying) {
    const icon = document.getElementById('global-play-icon');
    if (isPlaying) { icon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; icon.classList.remove('ml-0.5'); } 
    else { icon.innerHTML = `<path d="M8 5v14l11-7z"/>`; icon.classList.add('ml-0.5'); }
}

document.getElementById('progress-container').addEventListener('mousedown', function(e) {
    if (e.target.tagName.toLowerCase() === 'input') return;
    const rect = this.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (globalAudio.duration) {
        const newTime = percent * globalAudio.duration;
        globalAudio.currentTime = newTime;
        document.getElementById('global-progress-bar').style.width = `${percent * 100}%`;
        document.getElementById('global-slider').value = newTime;
        document.getElementById('global-current-time').innerText = formatTime(newTime);
        updateThumbPosition('progress', percent);
    }
});

document.getElementById('volume-container').addEventListener('mousedown', function(e) {
    if (e.target.tagName.toLowerCase() === 'input') return;
    const rect = this.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    changeVolume(percent);
    updateThumbPosition('volume', percent);
});

function updateThumbPosition(type, percent) {
    const thumb = document.getElementById(`${type}-thumb`);
    if (thumb) {
        thumb.style.left = `${percent * 100}%`;
        if (type === 'volume' && percent === 0) thumb.style.opacity = '0';
        else if (percent > 0) thumb.style.opacity = '1';
    }
}

globalAudio.addEventListener('timeupdate', () => {
    if (!globalAudio.duration) return;
    const percent = (globalAudio.currentTime / globalAudio.duration) * 100;
    document.getElementById('global-progress-bar').style.width = `${percent}%`;
    document.getElementById('global-slider').value = globalAudio.currentTime;
    document.getElementById('global-current-time').innerText = formatTime(globalAudio.currentTime);
    updateThumbPosition('progress', percent / 100);
});

globalAudio.addEventListener('loadedmetadata', () => {
    document.getElementById('global-duration').innerText = formatTime(globalAudio.duration);
    document.getElementById('global-slider').max = globalAudio.duration;
});

globalAudio.addEventListener('ended', () => {
    if (repeatMode === 2) { globalAudio.currentTime = 0; globalAudio.play(); } 
    else { playNext(); }
});

window.seekGlobalAudio = function(value) { 
    globalAudio.currentTime = value; 
    if (globalAudio.duration) {
        const percent = value / globalAudio.duration;
        document.getElementById('global-progress-bar').style.width = `${percent * 100}%`;
        updateThumbPosition('progress', percent);
    }
}

window.changeVolume = function(value) {
    globalAudio.volume = value;
    previousVolume = value;
    document.getElementById('volume-progress-bar').style.width = `${value * 100}%`;
    document.getElementById('global-volume-slider').value = value;
    updateThumbPosition('volume', value);
    const icon = document.getElementById('volume-icon');
    if(value == 0) icon.innerHTML = `<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>`;
    else if(value < 0.5) icon.innerHTML = `<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>`;
    else icon.innerHTML = `<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>`;
}

window.toggleMute = function() {
    if (globalAudio.volume > 0) { previousVolume = globalAudio.volume; changeVolume(0); } 
    else { changeVolume(previousVolume || 1); }
}

// --- ОЦЕНКА И КОММЕНТАРИИ ---
window.openRatingModal = function(trackId) {
    const track = allTracksData.find(t => t.id === trackId);
    if (!track) return;
    
    ratingTrackId = trackId;
    document.getElementById('modal-track-title').innerText = track.title;
    document.getElementById('modal-track-artist').innerText = track.artist || 'TrueEstimation';
    
    const coverImg = document.getElementById('modal-track-cover');
    if(track.cover_url) { coverImg.src = track.cover_url; coverImg.style.display = 'block'; } 
    else { coverImg.style.display = 'none'; }

    currentUserRating = track.userRating; 
    const deleteBtn = document.getElementById('delete-rating-btn');

    if (currentUserRating) {
        for(let i=1; i<=5; i++) document.getElementById(`crit-${i}`).value = 3;
        document.getElementById('rating-comment').value = currentUserRating.comment || '';
        deleteBtn.classList.remove('hidden');
    } else {
        for(let i=1; i<=5; i++) { document.getElementById(`crit-${i}`).value = 3; document.getElementById(`val-crit-${i}`).innerText = '3 / 6'; }
        document.getElementById('rating-comment').value = '';
        deleteBtn.classList.add('hidden');
    }

    updateTotalScore();
    document.getElementById('rating-modal').classList.remove('hidden');
}

window.closeRatingModal = function() {
    document.getElementById('rating-modal').classList.add('hidden');
    ratingTrackId = null;
    currentUserRating = null;
}

window.updateTotalScore = function() {
    let total = 0;
    for(let i=1; i<=5; i++) {
        const val = parseInt(document.getElementById(`crit-${i}`).value);
        document.getElementById(`val-crit-${i}`).innerText = `${val} / 6`;
        total += val;
    }
    document.getElementById('modal-total-score').innerText = total;
}

window.submitRating = async function() {
    if (!ratingTrackId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { showToast('Сначала войди в профиль!', 'error'); closeRatingModal(); return; }

    let totalScore = 0;
    for(let i=1; i<=5; i++) totalScore += parseInt(document.getElementById(`crit-${i}`).value);
    const commentText = document.getElementById('rating-comment').value.trim();

    const user = session.user;
    const { error } = await supabase.from('ratings').upsert({ 
        user_id: user.id, 
        track_id: ratingTrackId, 
        score: totalScore,
        comment: commentText || null
    }, { onConflict: 'user_id, track_id' });

    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { 
        showToast('Оценка сохранена!', 'success');
        closeRatingModal(); 
        await loadData(); 
    }
}

window.promptDeleteRating = function() {
    if (!ratingTrackId || !currentUserRating) return;
    showConfirm('Ты уверен, что хочешь удалить свою оценку и комментарий?', async () => {
        const { error } = await supabase.from('ratings').delete().match({ id: currentUserRating.id });
        if (error) showToast('Ошибка при удалении: ' + error.message, 'error');
        else {
            showToast('Оценка удалена', 'success');
            closeRatingModal();
            await loadData();
        }
    });
}

window.promptDeleteComment = function(ratingId) {
    showConfirm('Удалить свой комментарий и оценку?', async () => {
        const { error } = await supabase.from('ratings').delete().match({ id: ratingId });
        if (error) showToast('Ошибка: ' + error.message, 'error');
        else { showToast('Удалено', 'success'); await loadData(); }
    });
}

// --- ЛАЙКИ (ОПТИМИСТИЧНЫЕ) ---
window.likeTrack = async function(trackId, event) {
    event.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return showToast('Войди, чтобы ставить лайки!', 'error');

    const user = session.user;
    const track = allTracksData.find(t => t.id === trackId);
    if (!track) return;

    // 1. Мгновенно обновляем UI
    const wasLiked = track.userLiked;
    track.userLiked = !wasLiked;
    track.likesCount += wasLiked ? -1 : 1;
    
    // Перерисовываем список треков локально (мгновенно)
    renderTracksList(); 

    // 2. Отправляем запрос в фон
    if (wasLiked) {
        const { error } = await supabase.from('track_likes').delete().match({ user_id: user.id, track_id: trackId });
        if (error) { // Откат при ошибке
            track.userLiked = true; track.likesCount++; renderTracksList();
            showToast('Ошибка при удалении лайка', 'error');
        }
    } else {
        const { error } = await supabase.from('track_likes').insert({ user_id: user.id, track_id: trackId });
        if (error) { // Откат при ошибке
            track.userLiked = false; track.likesCount--; renderTracksList();
            showToast('Ошибка при лайке', 'error');
        }
    }
}

window.likeComment = async function(ratingId, event) {
    event.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return showToast('Войди, чтобы ставить лайки!', 'error');

    const user = session.user;
    const comment = allCommentsData.find(c => c.id === ratingId);
    if (!comment) return;

    // 1. Мгновенно обновляем UI
    const wasLiked = comment.userLiked;
    comment.userLiked = !wasLiked;
    comment.likesCount += wasLiked ? -1 : 1;
    
    renderCommentsView(); // Перерисовываем комменты

    // 2. Фоновый запрос
    if (wasLiked) {
        const { error } = await supabase.from('comment_likes').delete().match({ user_id: user.id, rating_id: ratingId });
        if (error) {
            comment.userLiked = true; comment.likesCount++; renderCommentsView();
        }
    } else {
        const { error } = await supabase.from('comment_likes').insert({ user_id: user.id, rating_id: ratingId });
        if (error) {
            comment.userLiked = false; comment.likesCount--; renderCommentsView();
        }
    }
}

// --- СОРТИРОВКА ---
window.changeSort = function(sortType) {
    currentSort = sortType;
    renderView();
}

// --- ЗАГРУЗКА ДАННЫХ ---
async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    currentUserId = session ? session.user.id : null;

    const [tracksRes, ratingsRes, trackLikesRes, commentLikesRes] = await Promise.all([
        supabase.from('tracks').select('*'),
        supabase.from('ratings').select('*'), 
        supabase.from('track_likes').select('*'),
        supabase.from('comment_likes').select('*')
    ]);

    if (tracksRes.error) return console.error(tracksRes.error);

    const tracks = tracksRes.data || [];
    const ratings = ratingsRes.data || [];
    const trackLikes = trackLikesRes.data || [];
    const commentLikes = commentLikesRes.data || [];

    const ratingsByTrack = new Map();
    ratings.forEach(r => {
        if (!ratingsByTrack.has(r.track_id)) ratingsByTrack.set(r.track_id, []);
        ratingsByTrack.get(r.track_id).push(r);
    });

    const likesByTrack = new Map();
    trackLikes.forEach(l => {
        if (!likesByTrack.has(l.track_id)) likesByTrack.set(l.track_id, []);
        likesByTrack.get(l.track_id).push(l.user_id);
    });

    const likesByComment = new Map();
    commentLikes.forEach(l => {
        if (!likesByComment.has(l.rating_id)) likesByComment.set(l.rating_id, []);
        likesByComment.get(l.rating_id).push(l.user_id);
    });

    allTracksData = [];
    let totalGlobalVotes = 0;

    for (const track of tracks) {
        const tRatings = ratingsByTrack.get(track.id) || [];
        const tLikes = likesByTrack.get(track.id) || [];
        const votesCount = tRatings.length;
        totalGlobalVotes += votesCount;

        let avgScore = 0;
        if (votesCount > 0) {
            const sum = tRatings.reduce((acc, curr) => acc + curr.score, 0);
            avgScore = parseFloat((sum / votesCount).toFixed(1));
        }

        let category = track.category;
        if (!category || category.trim() === "") category = 'Без категории';
        const userRatingObj = currentUserId ? tRatings.find(r => r.user_id === currentUserId) : null;

        allTracksData.push({ 
            ...track, category, avgScore, votesCount,
            likesCount: tLikes.length,
            userLiked: currentUserId ? tLikes.includes(currentUserId) : false,
            userRating: userRatingObj
        });
    }

    allCommentsData = ratings
        .filter(r => r.comment && r.comment.trim() !== "") 
        .map(r => {
            const cLikes = likesByComment.get(r.id) || [];
            const track = tracks.find(t => t.id === r.track_id);
            return {
                ...r,
                likesCount: cLikes.length,
                userLiked: currentUserId ? cLikes.includes(currentUserId) : false,
                trackTitle: track ? track.title : 'Неизвестный трек',
                trackArtist: track ? track.artist : '',
                trackCover: track ? track.cover_url : '',
                isOwn: currentUserId === r.user_id
            };
        });

    document.getElementById('stats-container').innerText = `${allTracksData.length} треков | ${totalGlobalVotes} оценок`;
    renderCategories(); 
    renderView(); 
}

function renderCategories() {
    const container = document.getElementById('categories-container');
    const dynamicCategories = Array.from(new Set(allTracksData.map(t => t.category).filter(c => c && c !== 'Все')));
    
    document.getElementById('nav-main').className = currentCategory === 'Главное меню' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';
    document.getElementById('nav-all').className = currentCategory === 'Все' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';
    document.getElementById('nav-comments').className = currentCategory === 'Комментарии' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';

    const htmlParts = dynamicCategories.map(cat => {
        const isActive = cat === currentCategory;
        const btnClass = isActive ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:text-white hover:bg-white/5 font-medium';
        const safeCat = escapeHtml(cat);
        const catArg = escapeHtml(JSON.stringify(cat));
        return `<button onclick='changeCategory(${catArg})' class="w-full text-left px-4 py-2.5 rounded-xl transition-all text-sm ${btnClass}">${safeCat}</button>`;
    });
    container.innerHTML = htmlParts.join('');
}

window.changeCategory = function(cat) {
    currentCategory = cat;
    renderCategories();
    renderView();
}

function renderView() {
    const heroContainer = document.getElementById('hero-container');
    const listViewContainer = document.getElementById('list-view-container');
    const commentsViewContainer = document.getElementById('comments-view-container');

    if (currentCategory === 'Главное меню') {
        listViewContainer.classList.add('hidden');
        commentsViewContainer.classList.add('hidden');
        heroContainer.classList.remove('hidden');
        renderHero();
    } else if (currentCategory === 'Комментарии') {
        heroContainer.classList.add('hidden');
        listViewContainer.classList.add('hidden');
        commentsViewContainer.classList.remove('hidden');
        renderCommentsView();
    } else {
        heroContainer.classList.add('hidden');
        commentsViewContainer.classList.add('hidden');
        listViewContainer.classList.remove('hidden');
        document.getElementById('current-category-title').innerText = currentCategory === 'Все' ? 'Все треки' : currentCategory;
        document.getElementById('sort-select').value = currentSort;
        renderTracksList();
    }
}

function renderHero() {
    const heroContainer = document.getElementById('hero-container');
    if (allTracksData.length === 0 || allTracksData[0].avgScore === 0) {
        heroContainer.innerHTML = `<div class="text-center text-gray-400 py-20 bg-white/5 rounded-3xl border border-white/10"><p class="text-xl">Пока нет оценок. Поставь первую оценку!</p></div>`;
        return;
    }
    const topTrack = allTracksData[0];
    const isPlayingThis = currentTrackId === topTrack.id && !globalAudio.paused;
    const iconPath = isPlayingThis ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>` : `<path class="ml-1" d="M8 5v14l11-7z"/>`;
    const topId = Number(topTrack.id);

    heroContainer.innerHTML = `
        <div class="relative bg-gradient-to-br from-green-900/40 to-gray-900/80 p-6 md:p-8 rounded-3xl border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.15)] overflow-hidden flex flex-col items-center text-center group mt-2 w-full max-w-3xl mx-auto">
            <div class="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"></div>
            <div class="text-green-400 text-xs font-bold tracking-widest uppercase mb-4 flex items-center gap-2 z-10"><span>🏆</span> Трек №1 <span>🏆</span></div>
            <img src="${topTrack.cover_url ? escapeHtml(topTrack.cover_url) : 'https://via.placeholder.com/500?text=No+Cover'}" class="w-48 h-48 md:w-56 md:h-56 rounded-2xl object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 mb-6 border-4 border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
            <h2 class="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight z-10 line-clamp-1">${escapeHtml(topTrack.title)}</h2>
            <p class="text-lg text-gray-300 mb-6 z-10">${escapeHtml(topTrack.artist || 'TrueEstimation')}</p>
            <div class="flex flex-col md:flex-row items-center justify-center gap-6 z-10 w-full">
                <div class="flex items-center gap-4 bg-black/40 px-5 py-2 rounded-2xl border border-white/10">
                    <button onclick="playTrack(${topId})" class="w-12 h-12 flex items-center justify-center bg-green-500 hover:bg-green-400 text-black rounded-full transition-transform active:scale-95 shadow-xl hover:scale-105">
                        <svg class="w-6 h-6 card-play-icon card-icon-${topId}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                    </button>
                    <div class="text-left">
                        <div class="text-yellow-400 font-extrabold text-2xl">${topTrack.avgScore} <span class="text-sm text-gray-400 font-medium">/ 30</span></div>
                        <div class="text-xs text-gray-400 font-medium">${topTrack.votesCount} оценок</div>
                    </div>
                </div>
                <button onclick="openRatingModal(${topId})" class="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 rounded-2xl font-bold text-base transition-all active:scale-95">Оценить трек</button>
            </div>
        </div>
    `;
}

function renderTracksList() {
    const container = document.getElementById('tracks-container');
    
    let filteredTracks = allTracksData;
    if (currentCategory !== 'Все') {
        filteredTracks = allTracksData.filter(t => t.category === currentCategory);
    }

    filteredTracks.sort((a, b) => {
        if (currentSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (currentSort === 'popular') return b.votesCount - a.votesCount;
        if (currentSort === 'likes') return b.likesCount - a.likesCount;
        return b.avgScore - a.avgScore; 
    });

    if (filteredTracks.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 py-10">Здесь пока пусто</p>`; return;
    }

    const htmlParts = filteredTracks.map(track => {
        const isPlayingThis = currentTrackId === track.id && !globalAudio.paused;
        const iconPath = isPlayingThis ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>` : `<path class="ml-0.5" d="M8 5v14l11-7z"/>`;
        const trackIdArg = Number(track.id);
        
        // Обновленная иконка лайка (чуть больше и без фона)
        const heartIcon = track.userLiked 
            ? `<svg class="w-6 h-6 text-red-500 fill-current transition-transform scale-110" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
            : `<svg class="w-6 h-6 text-gray-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

        return `
            <div class="group flex items-center p-2 rounded-xl hover:bg-white/10 transition-colors cursor-default">
                <div class="w-10 shrink-0 flex items-center justify-center">
                    <button onclick="playTrack(${trackIdArg})" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <svg class="w-6 h-6 card-play-icon card-icon-${trackIdArg}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                    </button>
                </div>

                <div class="w-12 shrink-0 pr-2">
                    ${track.cover_url 
                        ? `<img src="${escapeHtml(track.cover_url)}" class="w-10 h-10 rounded-md object-cover shadow-sm">` 
                        : `<div class="w-10 h-10 rounded-md bg-gray-800 flex items-center justify-center"><svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`
                    }
                </div>
                
                <div class="flex-1 min-w-0 pr-4">
                    <h2 class="text-sm font-bold truncate">${escapeHtml(track.title)}</h2>
                    <p class="text-xs text-gray-400 truncate">${escapeHtml(track.artist || 'TrueEstimation')}</p>
                </div>
                
                <div class="w-24 text-center shrink-0">
                    <div class="text-yellow-400 font-bold text-sm">${track.avgScore > 0 ? track.avgScore : '-'} <span class="text-[10px] text-gray-500 font-medium">/30</span></div>
                    <div class="text-[10px] text-gray-500">${track.votesCount} оц.</div>
                </div>
                
                <div class="w-24 text-center shrink-0 flex justify-center">
                    <!-- Убрали кривой фон, сделали кнопку аккуратным кружком -->
                    <button onclick="likeTrack(${trackIdArg}, event)" class="flex items-center gap-1.5 p-2 rounded-full hover:bg-white/5 transition-all active:scale-90" title="Поставить лайк">
                        ${heartIcon}
                        <span class="text-xs font-bold ${track.userLiked ? 'text-red-500' : 'text-gray-400'} w-4 text-left">${track.likesCount > 0 ? track.likesCount : ''}</span>
                    </button>
                </div>

                <div class="w-32 text-right shrink-0">
                    <button onclick="openRatingModal(${trackIdArg})" class="bg-white/5 hover:bg-white/20 border border-white/10 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 opacity-0 group-hover:opacity-100">Оценить</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = htmlParts.join('');
}

function renderCommentsView() {
    const container = document.getElementById('comments-list');
    
    if (allCommentsData.length === 0) {
        container.innerHTML = `<div class="text-gray-400 text-center py-10 bg-white/5 rounded-2xl border border-white/10">Пока нет комментариев. Стань первым!</div>`;
        return;
    }

    const sortedComments = [...allCommentsData].sort((a, b) => {
        if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const htmlParts = sortedComments.map(comment => {
        const dateStr = new Date(comment.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        
        // Увеличенные иконки для комментов
        const heartIcon = comment.userLiked
            ? `<svg class="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
            : `<svg class="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;

        // Увеличенная кнопка удаления
        const deleteBtn = comment.isOwn 
            ? `<button onclick="promptDeleteComment(${comment.id})" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors ml-2" title="Удалить">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span class="text-xs font-bold">Удалить</span>
               </button>` 
            : '';

        return `
            <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 transition-all hover:bg-white/10">
                <img src="${comment.trackCover ? escapeHtml(comment.trackCover) : 'https://via.placeholder.com/100?text=No+Cover'}" class="w-16 h-16 rounded-xl object-cover shadow-lg shrink-0">
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="text-sm font-bold text-white truncate cursor-pointer hover:underline" onclick="playTrack(${comment.track_id})">${escapeHtml(comment.trackTitle)}</h4>
                            <p class="text-xs text-gray-400 truncate">${escapeHtml(comment.trackArtist || 'TrueEstimation')}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] text-gray-500 whitespace-nowrap">${dateStr}</span>
                            ${deleteBtn}
                        </div>
                    </div>
                    <p class="text-sm text-gray-200 leading-relaxed mb-4">"${escapeHtml(comment.comment)}"</p>
                    
                    <div class="flex items-center gap-3">
                        <!-- Увеличенная кнопка лайка -->
                        <button onclick="likeComment(${comment.id}, event)" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all active:scale-95 group">
                            ${heartIcon}
                            <span class="text-sm font-bold ${comment.userLiked ? 'text-red-500' : 'text-gray-400 group-hover:text-white'}">${comment.likesCount > 0 ? comment.likesCount : '0'}</span>
                        </button>
                        <div class="text-xs text-gray-400 bg-black/30 px-3 py-1.5 rounded-lg">Оценка: <span class="text-yellow-400 font-bold">${comment.score} / 30</span></div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = htmlParts.join('');
}

// Инициализация
loadData();
