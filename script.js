import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://szmwwykgtwdosauounds.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_O4raj-GlUeg3p8E62TQ_X3gpfZER'; 

const supabase = createClient(supabaseUrl, supabaseKey);

const globalAudio = new Audio();
let currentTrackId = null;
let allTracksData = []; 
let currentCategory = 'Все';
let ratingTrackId = null; // ID трека, который сейчас оцениваем

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

    // Сброс ползунков на дефолт (3)
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
        closeRatingModal();
        return;
    }

    let totalScore = 0;
    for(let i=1; i<=5; i++) {
        totalScore += parseInt(document.getElementById(`crit-${i}`).value);
    }

    const user = session.user;
    const { error } = await supabase
        .from('ratings')
        .upsert({ user_id: user.id, track_id: ratingTrackId, score: totalScore }, { onConflict: 'user_id, track_id' });

    if (error) {
        alert('Ошибка при сохранении: ' + error.message);
    } else {
        closeRatingModal();
        await loadData(); // Перезагружаем, чтобы обновить средние баллы
    }
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

// --- ЗАГРУЗКА И ФИЛЬТРАЦИЯ ---
async function loadData() {
    const { data: tracks, error } = await supabase.from('tracks').select('*');
    if (error) { 
        document.getElementById('tracks-container').innerHTML = `<p class="text-red-500">Ошибка загрузки: ${error.message}</p>`;
        return; 
    }

    allTracksData = [];
    let totalGlobalVotes = 0;
    const categories = new Set(['Все']);

    for (const track of tracks) {
        const { data: ratings } = await supabase.from('ratings').select('score').eq('track_id', track.id);
        
        let avgScore = 0;
        let votesCount = ratings ? ratings.length : 0;
        totalGlobalVotes += votesCount;

        if (votesCount > 0) {
            const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
            avgScore = (sum / votesCount).toFixed(1);
        }

        if (track.category && track.category.trim() !== "") categories.add(track.category.trim());
        else track.category = 'Все';

        allTracksData.push({ ...track, avgScore: parseFloat(avgScore), votesCount });
    }

    document.getElementById('stats-container').innerText = `Треков: ${allTracksData.length} | Оценок: ${totalGlobalVotes}`;
    allTracksData.sort((a, b) => b.avgScore - a.avgScore);

    renderCategories(Array.from(categories));
    renderHero(); 
    renderTracksList(); 
}

function renderCategories(categories) {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    categories.forEach(cat => {
        const isActive = cat === currentCategory;
        const btnClass = isActive ? 'bg-green-500 text-black font-bold' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white font-medium';
        container.innerHTML += `<button onclick="changeCategory('${cat}')" class="w-full text-left px-4 py-2.5 rounded-xl transition-all text-sm ${btnClass}">${cat}</button>`;
    });
}

window.changeCategory = function(cat) {
    currentCategory = cat;
    document.getElementById('current-category-title').innerText = cat === 'Все' ? 'Все треки' : cat;
    renderCategories(Array.from(new Set(allTracksData.map(t => t.category))));
    renderTracksList();
}

function renderHero() {
    const heroContainer = document.getElementById('hero-container');
    if (allTracksData.length === 0 || allTracksData[0].avgScore === 0) {
        heroContainer.classList.add('hidden'); return;
    }

    const topTrack = allTracksData[0];
    const isPlayingThis = currentTrackId === topTrack.id && !globalAudio.paused;
    const iconPath = isPlayingThis ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>` : `<path class="ml-1" d="M8 5v14l11-7z"/>`;

    heroContainer.innerHTML = `
        <div class="relative bg-gradient-to-br from-green-900/40 to-gray-900/80 p-6 md:p-8 rounded-3xl border border-green-500/30 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center gap-6 group">
            <div class="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-green-500/20 rounded-full blur-3xl"></div>
            <img src="${topTrack.cover_url || ''}" class="w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover shadow-[0_0_30px_rgba(34,197,94,0.3)] z-10 shrink-0">
            <div class="flex-1 text-center md:text-left z-10 w-full">
                <div class="text-green-400 text-xs font-bold tracking-widest uppercase mb-2">🏆 Трек недели / Лучшее</div>
                <h2 class="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight line-clamp-1">${topTrack.title}</h2>
                <p class="text-gray-300 text-lg mb-6">${topTrack.artist || 'TrueEstimation'}</p>
                <div class="flex items-center justify-center md:justify-start gap-4">
                    <button onclick="playTrack(${topTrack.id})" class="w-14 h-14 flex items-center justify-center bg-green-500 hover:bg-green-400 text-black rounded-full transition-transform active:scale-95 shadow-xl hover:scale-105">
                        <svg class="w-6 h-6 card-play-icon card-icon-${topTrack.id}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                    </button>
                    <div class="text-left">
                        <div class="text-yellow-400 font-extrabold text-2xl">${topTrack.avgScore} <span class="text-sm text-gray-400 font-medium">/ 30</span></div>
                        <div class="text-xs text-gray-400">${topTrack.votesCount} голосов</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    heroContainer.classList.remove('hidden');
}

function renderTracksList() {
    const container = document.getElementById('tracks-container');
    container.innerHTML = '';
    let filteredTracks = allTracksData;
    if (currentCategory !== 'Все') filteredTracks = allTracksData.filter(t => t.category === currentCategory);

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
                
                <!-- Правая часть с оценкой и кнопкой -->
                <div class="flex items-center gap-4">
                    <div class="text-right hidden sm:block">
                        <div class="text-yellow-400 font-extrabold text-lg">⭐ ${track.avgScore > 0 ? track.avgScore : '-'} <span class="text-xs text-gray-500 font-medium">/ 30</span></div>
                        <div class="text-[10px] text-gray-400">${track.votesCount} оценок</div>
                    </div>
                    
                    <button onclick="openRatingModal(${track.id})" class="bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95">
                        Оценить
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += trackHTML;
    }
}

loadData();
