import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// === ВСТАВЬ СВОИ КЛЮЧИ СЮДА (проверь, что они на месте) ===
const supabaseUrl = 'https://szmwwykgtwdosouands.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_04raj-G1Ueg3p8E62TQ_X3gpfZER'; // Твой ключ
// ==========================================================

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// ЗДЕСЬ СПИСОК ТВОИХ ТРЕКОВ
// Вместо "Название трека" напиши реальные названия
// ==========================================
const myTracks = [
    {
        id: 1, 
        title: "Название трека 1", 
        audio_url: "./1.mp3", 
        cover_url: "" 
    },
    {
        id: 2,
        title: "Название трека 2",
        audio_url: "./2.mp3",
        cover_url: ""
    },
    {
        id: 3,
        title: "Название трека 3",
        audio_url: "./3.mp3",
        cover_url: ""
    },
    {
        id: 4,
        title: "Название трека 4",
        audio_url: "./4.mp3",
        cover_url: ""
    },
    {
        id: 5,
        title: "Название трека 5",
        audio_url: "./5.mp3",
        cover_url: ""
    },
    {
        id: 6,
        title: "Название трека 6",
        audio_url: "./6.mp3",
        cover_url: ""
    }
];
// ==========================================

// Проверяем, вошел ли пользователь
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

// Функция Входа/Регистрации
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

// Функция Выхода
window.logout = async function() {
    await supabase.auth.signOut();
}

// Отрисовка треков и оценок
async function loadTracks() {
    const container = document.getElementById('tracks-container');
    container.innerHTML = ''; 

    // Перебираем наши треки
    for (const track of myTracks) {
        
        // Запрашиваем оценки ТОЛЬКО из Supabase
        const { data: ratings } = await supabase.from('ratings').select('score').eq('track_id', track.id);
        
        let avgScore = 0;
        if (ratings && ratings.length > 0) {
            const sum = ratings.reduce((acc, curr) => acc + curr.score, 0);
            avgScore = (sum / ratings.length).toFixed(1);
        }

        // Создаем карточку трека. Ссылка на аудио берется прямо из GitHub
        const trackHTML = `
            <div class="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700">
                <h2 class="text-xl font-bold mb-3">${track.title}</h2>
                
                <!-- Плеер берет файл прямо из папки с сайтом (./1.mp3) -->
                <audio controls src="${track.audio_url}" class="w-full mb-4"></audio>
                
                <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="text-yellow-400 font-bold text-lg">
                        ⭐ ${avgScore > 0 ? avgScore : 'Нет оценок'} <span class="text-gray-400 text-sm font-normal">(${ratings ? ratings.length : 0} голосов)</span>
                    </div>
                    
                    <!-- Кнопки оценок от 1 до 10 -->
                    <div class="flex flex-wrap gap-1 justify-center">
                        ${[1,2,3,4,5,6,7,8,9,10].map(score => 
                            `<button onclick="rateTrack(${track.id}, ${score})" class="bg-gray-700 hover:bg-green-500 w-8 h-8 rounded-full font-bold transition text-sm">${score}</button>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += trackHTML;
    }
}

// Постановка оценки (отправляет данные в Supabase)
window.rateTrack = async function(trackId, score) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert('Чтобы ставить оценки, сначала войди или зарегистрируйся!');
        return;
    }

    const user = session.user;

    // Сохраняем оценку в базу
    const { error } = await supabase
        .from('ratings')
        .upsert({ 
            user_id: user.id, 
            track_id: trackId, 
            score: score 
        }, { onConflict: 'user_id, track_id' });

    if (error) {
        alert('Ошибка при сохранении: ' + error.message);
    } else {
        loadTracks(); // Перезагружаем, чтобы обновить средний балл
    }
}

// Запускаем всё при загрузке страницы
loadTracks();
