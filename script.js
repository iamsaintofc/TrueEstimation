import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://szmwwykgtwdosouands.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_04raj-G1Ueg3p8E62TQ_X3gpfZER'; 

const supabase = createClient(supabaseUrl, supabaseKey);

const globalAudio = new Audio();
let currentTrackId = null;
let allTracksData = []; 

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
        if (signUpError) alert('Ошибка регистрации: ' + signUpError.message);
        else alert('Аккаунт создан! Вы вошли.');
    } else if (error) {
        alert('Ошибка: ' + error.message);
    }
}

window.logout = async function() {
    await supabase.auth.signOut();
}

// --- ПЛЕЕР ---
window.playTrack = function(trackId) {
    const track = allTracksData.find(t => t.id === trackId);
    if (!track) return;

    if (currentTrackId === trackId) {
        toggleGlobalPlay();
        return;
    }

    currentTrackId = trackId;
    globalAudio.src = track.audio_url;
    globalAudio.play();

    document.getElementById('global-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = track.title;
    // Выводим исполнителя, если он есть в базе, иначе дефолтный текст
    document.getElementById('player-artist').innerText = track.artist ? track.artist : 'TrueEstimation';
    
    const coverImg = document.getElementById('player-cover');
    if(track.cover_url) {
        coverImg.src = track.cover_url;
        coverImg.style.display = 'block';
    } else {
        coverImg.style.display = 'none';
    }

    document.querySelectorAll('.card-play-icon').forEach(icon => {
        icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    });
    const activeCardIcon = document.getElementById(`card-icon-${trackId}`);
    if(activeCardIcon) activeCardIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;

    updateGlobalPlayPauseIcon(true);
}

window.toggleGlobalPlay = function() {
    if (!currentTrackId) return;

    if (globalAudio.paused) {
        globalAudio.play();
        updateGlobalPlayPauseIcon(true);
        const activeCardIcon = document.getElementById(`card-icon-${currentTrackId}`);
        if(activeCardIcon) activeCardIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    } else {
        globalAudio.pause();
        updateGlobalPlayPauseIcon(false);
        const activeCardIcon = document.getElementById(`card-icon-${currentTrackId}`);
        if(activeCardIcon) activeCardIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    }
}

function updateGlobalPlayPauseIcon(isPlaying) {
    const icon = document.getElementById('global-play-icon');
    if (isPlaying) {
        icon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    } else {
        icon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    }
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
    
    const activeCardIcon = document.getElementById(`card-icon-${currentTrackId}`);
    if(activeCardIcon) activeCardIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
});

window.seekGlobalAudio = function(value) {
    globalAudio.currentTime = value;
}

window.changeVolume = function(value) {
    globalAudio.volume = value;
    document.getElementById('volume-progress-bar').style.width = `${value * 100}%`;
}

// --- ЗАГРУЗКА ТРЕКОВ ---
async function loadTracks() {
    const container = document.getElementById('tracks-container');
    const statsContainer = document.getElementById('stats-container');
    
    const { data: tracks, error } = await supabase.from('tracks').select('*');
    if (error) { 
        container.innerHTML = `<p class="text-red-500 text-center">Ошибка загрузки: ${error.message}</p>`;
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

        allTracksData.push({ ...track, avgScore, votesCount });
    }

    statsContainer.innerText = `Всего треков: ${allTracksData.length}  |  Всего оценок: ${totalGlobalVotes}`;

    allTracksData.sort((a, b) => {
        if (b.avgScore == 0) return -1;
        return b.avgScore - a.avgScore;
    });

    container.innerHTML = ''; 

    for (const track of allTracksData) {
        const isPlayingThis = currentTrackId === track.id && !globalAudio.paused;
        const iconPath = isPlayingThis ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>` : `<path d="M8 5v14l11-7z"/>`;

        // Добавили вывод исполнителя (artist) под названием
        const trackHTML = `
            <div class="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all duration-300 shadow-xl group flex items-center justify-between gap-4">
                
                <div class="flex items-center gap-4 flex-1 min-w-0">
                    ${track.cover_url 
                        ? `<img src="${track.cover_url}" class="w-14 h-14 rounded-lg object-cover shadow-lg shrink-0">` 
                        : `<div class="w-14 h-14 rounded-lg bg-gray-800 flex items-center justify-center shadow-lg shrink-0"><svg class="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`
                    }
                    
                    <div class="flex-1 min-w-0">
                        <h2 class="text-lg font-bold tracking-tight truncate">${track.title}</h2>
                        <!-- Выводим исполнителя -->
                        <p class="text-sm text-gray-400 truncate mb-1">${track.artist ? track.artist : 'TrueEstimation'}</p>
                        
                        <div class="flex items-center gap-3 mt-1">
                            <button onclick="playTrack(${track.id})" class="flex items-center gap-1.5 text-green-400 hover:text-green-300 transition-colors text-sm font-semibold">
                                <svg id="card-icon-${track.id}" class="w-4 h-4 card-play-icon" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                                Слушать
                            </button>
                            
                            <div class="flex items-center gap-1 text-sm bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                <span class="text-yellow-400">⭐</span>
                                <span class="font-bold">${track.avgScore > 0 ? track.avgScore : '-'}</span>
                                <span class="text-gray-500 text-xs">(${track.votesCount})</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="hidden md:flex flex-wrap gap-1 justify-end w-1/3">
                    ${[1,2,3,4,5,6,7,8,9,10].map(score => 
                        `<button onclick="rateTrack(${track.id}, ${score})" class="w-7 h-7 rounded-md bg-white/5 hover:bg-green-500 hover:text-black border border-white/10 font-bold transition-all duration-200 active:scale-90 shadow-sm text-xs">${score}</button>`
                    ).join('')}
                </div>
            </div>
        `;
        container.innerHTML += trackHTML;
    }
}

window.rateTrack = async function(trackId, score) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert('Чтобы ставить оценки, сначала войди или зарегистрируйся!');

    const user = session.user;
    const { error } = await supabase
        .from('ratings')
        .upsert({ user_id: user.id, track_id: trackId, score: score }, { onConflict: 'user_id, track_id' });

    if (error) {
        alert('Ошибка при сохранении: ' + error.message);
    } else {
        await loadTracks();
    }
}

loadTracks();
