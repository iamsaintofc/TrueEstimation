import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://szmwwykgtwdosauounds.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_O4raj-GlUeg3p8E62TQ_X3gpfZER'; 

const supabase = createClient(supabaseUrl, supabaseKey);

const globalAudio = new Audio();
let currentTrackId = null;
let allTracksData = []; 
let currentCategory = 'Главное меню';
let ratingTrackId = null;

// --- УВЕДОМЛЕНИЯ ---
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
    setTimeout(() => {
        toast.classList.add('translate-y-[-20px]', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- АВТОРИЗАЦИЯ И ПРОФИЛЬ ---
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-email-display').innerText = session.user.email;
        document.getElementById('user-avatar-letter').innerText = session.user.email.charAt(0).toUpperCase();
    } else {
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
    
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error && error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) showToast('Ошибка: ' + signUpError.message, 'error');
        else {
            showToast('Аккаунт создан! Вы вошли.', 'success');
            closeLoginModal();
        }
    } else if (error) {
        showToast('Ошибка: ' + error.message, 'error');
    } else {
        showToast('Успешный вход!', 'success');
        closeLoginModal();
    }
}

window.logout = async function() { 
    await supabase.auth.signOut(); 
    showToast('Вы вышли из аккаунта', 'success');
}

// --- ПЛЕЕР (Оптимизированный) ---
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

function updateAllPlayIcons() {
    document.querySelectorAll('.card-play-icon').forEach(icon => {
        icon.innerHTML = `<path class="ml-0.5" d="M8 5v14l11-7z"/>`;
    });
    if (currentTrackId && !globalAudio.paused) {
        const activeIcons = document.querySelectorAll(`.card-icon-${currentTrackId}`);
        activeIcons.forEach(icon => { icon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; });
    }
}

function updateGlobalPlayPauseIcon(isPlaying) {
    const icon = document.getElementById('global-play-icon');
    if (isPlaying) { icon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; icon.classList.remove('ml-1'); } 
    else { icon.innerHTML = `<path d="M8 5v14l11-7z"/>`; icon.classList.add('ml-1'); }
}

// Слушатели плеера
globalAudio.addEventListener('timeupdate', () => {
    if (!globalAudio.duration) return;
    const percent = (globalAudio.currentTime / globalAudio.duration) * 100;
    document.getElementById('global-progress-bar').style.width = `${percent}%`;
    document.getElementById('global-slider').value = globalAudio.currentTime;
    document.getElementById('global-current-time').innerText = formatTime(globalAudio.currentTime);
});

globalAudio.addEventListener('loadedmetadata', () => {
    document.getElementById('global-duration').innerText = formatTime(globalAudio.duration);
    document.getElementById('global-slider').max = globalAudio.duration;
});

globalAudio.addEventListener('ended', () => {
    updateGlobalPlayPauseIcon(false);
    document.getElementById('global-progress-bar').style.width = `0%`;
    document.getElementById('global-slider').value = 0;
    document.getElementById('global-current-time').innerText = "0:00";
    updateAllPlayIcons();
});

window.seekGlobalAudio = function(value) { globalAudio.currentTime = value; }
window.changeVolume = function(value) {
    globalAudio.volume = value;
    document.getElementById('volume-progress-bar').style.width = `${value * 100}%`;
}

// --- МОДАЛЬНОЕ ОКНО ОЦЕНКИ ---
window.openRatingModal = function(trackId) {
    const track = allTracksData.find(t => t.id === trackId);
    if (!track) return;

    ratingTrackId = trackId;
    document.getElementById('modal-track-title').innerText = track.title;
    document.getElementById('modal-track-artist').innerText = track.artist || 'TrueEstimation';
    
    const coverImg = document.getElementById('modal-track-cover');
    if(track.cover_url) { coverImg.src = track.cover_url; coverImg.style.display = 'block'; } 
    else { coverImg.style.display = 'none'; }

    for(let i=1; i<=5; i++) {
        document.getElementById(`crit-${i}`).value = 3;
        document.getElementById(`val-crit-${i}`).innerText = '3 / 6';
    }
    updateTotalScore();
    document.getElementById('rating-modal').classList.remove('hidden');
}

window.closeRatingModal = function() {
    document.getElementById('rating-modal').classList.add('hidden');
    ratingTrackId = null;
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
    if (!session) {
        showToast('Сначала войди в профиль!', 'error');
        closeRatingModal(); return;
    }

    let totalScore = 0;
    for(let i=1; i<=5; i++) totalScore += parseInt(document.getElementById(`crit-${i}`).value);

    const user = session.user;
    const { error } = await supabase
        .from('ratings')
        .upsert({ user_id: user.id, track_id: ratingTrackId, score: totalScore }, { onConflict: 'user_id, track_id' });

    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { 
        showToast('Оценка сохранена!', 'success');
        closeRatingModal(); 
        await loadData(); 
    }
}

// --- ЗАГРУЗКА ДАННЫХ ---
async function loadData() {
    const { data: tracks, error } = await supabase.from('tracks').select('*');
    if (error) { 
        document.getElementById('tracks-container').innerHTML = `<p class="text-red-500">Ошибка загрузки: ${error.message}</p>`;
        return; 
    }

    allTracksData = [];
    let totalGlobalVotes = 0;

    for (const track of tracks) {
        const { data: ratings } = await supabase.from('ratings').select('score').eq('track_id', track.id);
        let avgScore = 0;
        let votesCount = ratings ? ratings.length : 0;
        totalGlobalVotes += votesCount;

        if (votesCount > 0) {
            const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
            avgScore = (sum / votesCount).toFixed(1);
        }

        if (!track.category || track.category.trim() === "") track.category = 'Без категории';
        allTracksData.push({ ...track, avgScore: parseFloat(avgScore), votesCount });
    }

    document.getElementById('stats-container').innerText = `${allTracksData.length} треков | ${totalGlobalVotes} оценок`;
    allTracksData.sort((a, b) => b.avgScore - a.avgScore);

    renderCategories(); 
    renderView(); 
}

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    const baseCategories = ['Главное меню', 'Все'];
    const dynamicCategories = Array.from(new Set(allTracksData.map(t => t.category).filter(c => c && c !== 'Все')));
    const allCategories = [...baseCategories, ...dynamicCategories];

    // Подсветка активного таба в навигации
    document.getElementById('nav-main').className = currentCategory === 'Главное меню' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';
    document.getElementById('nav-all').className = currentCategory === 'Все' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';

    // Рендер динамических категорий
    dynamicCategories.forEach(cat => {
        const isActive = cat === currentCategory;
        const btnClass = isActive ? 'bg-white/10 text-white font-bold' : 'text-gray-300 hover:text-white hover:bg-white/5 font-medium';
        container.innerHTML += `<button onclick="changeCategory('${cat}')" class="w-full text-left px-4 py-2.5 rounded-xl transition-all text-sm ${btnClass}">${cat}</button>`;
    });
}

window.changeCategory = function(cat) {
    currentCategory = cat;
    renderCategories();
    renderView();
}

function renderView() {
    const heroContainer = document.getElementById('hero-container');
    const listViewContainer = document.getElementById('list-view-container');

    if (currentCategory === 'Главное меню') {
        listViewContainer.classList.add('hidden');
        heroContainer.classList.remove('hidden');
        renderHero();
    } else {
        heroContainer.classList.add('hidden');
        listViewContainer.classList.remove('hidden');
        document.getElementById('current-category-title').innerText = currentCategory === 'Все' ? 'Все треки' : currentCategory;
        renderTracksList();
    }
}

function renderHero() {
    const heroContainer = document.getElementById('hero-container');
    if (allTracksData.length === 0 || allTracksData[0].avgScore === 0) {
        heroContainer.innerHTML = `<div class="text-center text-gray-400 py-20 bg-white/5 rounded-3xl border border-white/10"><p class="text-xl">Пока нет оценок. Поставь первую оценку, чтобы определить лучший трек!</p></div>`;
        return;
    }

    const topTrack = allTracksData[0];
    const isPlayingThis = currentTrackId === topTrack.id && !globalAudio.paused;
    const iconPath = isPlayingThis ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>` : `<path class="ml-1" d="M8 5v14l11-7z"/>`;

    heroContainer.innerHTML = `
        <div class="relative bg-gradient-to-br from-green-900/40 to-gray-900/80 p-8 md:p-12 rounded-3xl border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.15)] overflow-hidden flex flex-col items-center text-center group mt-6">
            <div class="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"></div>
            
            <div class="text-green-400 text-sm font-bold tracking-widest uppercase mb-6 flex items-center gap-2 z-10">
                <span>🏆</span> Трек №1 на сайте <span>🏆</span>
            </div>
            
            <img src="${topTrack.cover_url || 'https://via.placeholder.com/500?text=No+Cover'}" class="w-64 h-64 md:w-80 md:h-80 rounded-3xl object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 mb-8 border-4 border-white/10 group-hover:scale-[1.02] transition-transform duration-500">
            
            <h2 class="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight z-10">${topTrack.title}</h2>
            <p class="text-xl text-gray-300 mb-8 z-10">${topTrack.artist || 'TrueEstimation'}</p>
            
            <div class="flex flex-col md:flex-row items-center justify-center gap-8 z-10 w-full">
                <div class="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/10">
                    <button onclick="playTrack(${topTrack.id})" class="w-16 h-16 flex items-center justify-center bg-green-500 hover:bg-green-400 text-black rounded-full transition-transform active:scale-95 shadow-xl hover:scale-105">
                        <svg class="w-8 h-8 card-play-icon card-icon-${topTrack.id}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                    </button>
                    <div class="text-left">
                        <div class="text-yellow-400 font-extrabold text-3xl">${topTrack.avgScore} <span class="text-lg text-gray-400 font-medium">/ 30</span></div>
                        <div class="text-sm text-gray-400 font-medium">${topTrack.votesCount} оценок</div>
                    </div>
                </div>
                
                <button onclick="openRatingModal(${topTrack.id})" class="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95">
                    Оценить трек
                </button>
            </div>
        </div>
    `;
}

function renderTracksList() {
    const container = document.getElementById('tracks-container');
    container.innerHTML = '';
    
    let filteredTracks = allTracksData;
    if (currentCategory !== 'Все') {
        filteredTracks = allTracksData.filter(t => t.category === currentCategory);
    }

    if (filteredTracks.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 py-10">В этой категории пока нет треков</p>`; return;
    }

    for (const track of filteredTracks) {
        const isPlayingThis = currentTrackId === track.id && !globalAudio.paused;
        const iconPath = isPlayingThis ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>` : `<path class="ml-0.5" d="M8 5v14l11-7z"/>`;

        // Строка списка (как в Яндексе)
        const trackHTML = `
            <div class="group flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors cursor-default">
                
                <div class="flex items-center gap-4 flex-1 min-w-0">
                    <!-- Кнопка Play -->
                    <button onclick="playTrack(${track.id})" class="w-10 h-10 flex-shrink-0 flex items-center justify-center text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <svg class="w-6 h-6 card-play-icon card-icon-${track.id}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                    </button>

                    <!-- Обложка -->
                    ${track.cover_url 
                        ? `<img src="${track.cover_url}" class="w-10 h-10 rounded-md object-cover shadow-sm shrink-0">` 
                        : `<div class="w-10 h-10 rounded-md bg-gray-800 flex items-center justify-center shrink-0"><svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`
                    }
                    
                    <!-- Название и Исполнитель -->
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                        <h2 class="text-sm font-bold truncate">${track.title}</h2>
                        <p class="text-xs text-gray-400 truncate">${track.artist || 'TrueEstimation'}</p>
                    </div>
                </div>
                
                <!-- Рейтинг и Кнопка -->
                <div class="flex items-center gap-6 pr-4">
                    <div class="text-center hidden md:block">
                        <div class="text-yellow-400 font-bold text-sm">${track.avgScore > 0 ? track.avgScore : '-'} <span class="text-[10px] text-gray-500 font-medium">/ 30</span></div>
                        <div class="text-[10px] text-gray-500">${track.votesCount} оценок</div>
                    </div>
                    
                    <button onclick="openRatingModal(${track.id})" class="bg-white/5 hover:bg-white/20 border border-white/10 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 opacity-0 group-hover:opacity-100">Оценить</button>
                </div>
            </div>
        `;
        container.innerHTML += trackHTML;
    }
}

// Инициализация
loadData();
