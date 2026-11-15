import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://szmwwykgtwdosauounds.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_O4raj-GlUeg3p8E62TQ_X3gpfZER'; 

const supabase = createClient(supabaseUrl, supabaseKey);

const globalAudio = new Audio();
let currentTrackId = null;
let allTracksData = []; 
let currentCategory = 'Главное меню'; // Теперь по умолчанию открывается Главное меню
let ratingTrackId = null;

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- АВТОРИЗАЦИЯ ---
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('auth-section').classList.remove('flex');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-info').classList.add('flex');
        document.getElementById('user-email').innerText = session.user.email;
    } else {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('auth-section').classList.add('flex');
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('user-info').classList.remove('flex');
    }
});

window.login = async function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if(!email || !password) return alert("Введи email и пароль!");
    
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) alert('Ошибка: ' + signUpError.message);
        else alert('Аккаунт создан! Вы вошли.');
    } else if (error) alert('Ошибка: ' + error.message);
}
window.logout = async function() { await supabase.auth.signOut(); }

// --- МОДАЛЬНОЕ ОКНО ОЦЕНКИ ---
window.openRatingModal = function(trackId) {
    const track = allTracksData.find(t => t.id === trackId);
    if (!track) return;

    ratingTrackId = trackId;
    document.getElementById('modal-track-title').innerText = track.title;
    document.getElementById('modal-track-artist').innerText = track.artist || 'TrueEstimation';
    
    const coverImg = document.getElementById('modal-track-cover');
    if(track.cover_url) {
        coverImg.src = track.cover_url;
        coverImg.style.display = 'block';
    } else {
        coverImg.style.display = 'none';
    }

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
        alert('Чтобы ставить оценки, сначала войди или зарегистрируйся!');
        closeRatingModal(); return;
    }

    let totalScore = 0;
    for(let i=1; i<=5; i++) totalScore += parseInt(document.getElementById(`crit-${i}`).value);

    const user = session.user;
    const { error } = await supabase
        .from('ratings')
        .upsert({ user_id: user.id, track_id: ratingTrackId, score: totalScore }, { onConflict: 'user_id, track_id' });

    if (error) alert('Ошибка при сохранении: ' + error.message);
    else { closeRatingModal(); await loadData(); }
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

    document.getElementById('stats-container').innerText = `Треков: ${allTracksData.length} | Оценок: ${totalGlobalVotes}`;
    allTracksData.sort((a, b) => b.avgScore - a.avgScore);

    renderCategories(); 
    renderView(); 
}

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    
    // Базовые категории, которые есть всегда
    const baseCategories = ['Главное меню', 'Все'];
    
    // Собираем уникальные категории из треков
    const dynamicCategories = Array.from(new Set(allTracksData.map(t => t.category).filter(c => c && c !== 'Все')));
    
    const allCategories = [...baseCategories, ...dynamicCategories];

    allCategories.forEach(cat => {
        const isActive = cat === currentCategory;
        const btnClass = isActive ? 'bg-green-500 text-black font-bold' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white font-medium';
        container.innerHTML += `<button onclick="changeCategory('${cat}')" class="w-full text-left px-4 py-2.5 rounded-xl transition-all text-sm ${btnClass}">${cat}</button>`;
    });
}

window.changeCategory = function(cat) {
    currentCategory = cat;
    renderCategories();
    renderView();
}

// Управление отображением (Главное меню ИЛИ Список)
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

// ОГРОМНЫЙ ГЛАВНЫЙ ТРЕК
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
        <div class="relative bg-gradient-to-br from-green-900/40 to-gray-900/80 p-8 md:p-12 rounded-3xl border border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.15)] overflow-hidden flex flex-col items-center text-center group">
            <!-- Атмосферный фон -->
            <div class="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"></div>
            <div class="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"></div>
            
            <div class="text-green-400 text-sm font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                <span>🏆</span> Трек №1 на сайте <span>🏆</span>
            </div>
            
            <!-- Огромная обложка -->
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

        const trackHTML = `
            <div class="bg-white/5 backdrop-blur-sm p-3 md:p-4 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all duration-300 shadow-xl group flex items-center justify-between gap-4">
                <div class="flex items-center gap-4 flex-1 min-w-0">
                    <button onclick="playTrack(${track.id})" class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-green-500 hover:bg-green-400 text-black rounded-full transition-transform active:scale-95 shadow-lg">
                        <svg class="w-5 h-5 card-play-icon card-icon-${track.id}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                    </button>
                    ${track.cover_url 
                        ? `<img src="${track.cover_url}" class="w-12 h-12 rounded-lg object-cover shadow-lg shrink-0 hidden md:block">` 
                        : `<div class="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center shadow-lg shrink-0 hidden md:flex"><svg class="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`
                    }
                    <div class="flex-1 min-w-0">
                        <h2 class="text-lg font-bold tracking-tight truncate">${track.title}</h2>
                        <p class="text-sm text-gray-400 truncate">${track.artist ? track.artist : 'TrueEstimation'}</p>
                    </div>
                </div>
                
                <div class="flex items-center gap-4">
                    <div class="text-right hidden sm:block">
                        <div class="text-yellow-400 font-extrabold text-lg">⭐ ${track.avgScore > 0 ? track.avgScore : '-'} <span class="text-xs text-gray-500 font-medium">/ 30</span></div>
                        <div class="text-[10px] text-gray-400">${track.votesCount} оценок</div>
                    </div>
                    <button onclick="openRatingModal(${track.id})" class="bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95">Оценить</button>
                </div>
            </div>
        `;
        container.innerHTML += trackHTML;
    }
}

loadData();
