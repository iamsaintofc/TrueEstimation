import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://szmwwykgtwdosauounds.supabase.co'; 
const supabaseKey = 'sb_publishable_0r_O4raj-GlUeg3p8E62TQ_X3gpfZER'; 
const supabase = createClient(supabaseUrl, supabaseKey);
const MASTER_ADMIN_EMAIL = 'zahavalgovno777@gmail.com';

const translations = {
    ru: { main: 'Главное', all: 'Все треки', comments: 'Комментарии', admin: 'Админ-панель', playlists: 'Плейлисты', liked: 'Мне понравилось', settings: 'Настройки', logout: 'Выйти', search: 'Поиск...', addTrack: 'Добавить трек', title: 'Название', artist: 'Исполнитель', category: 'Категория', audioUrl: 'Ссылка на аудио', coverUrl: 'Ссылка на обложку', emptyComments: 'Пока нет комментариев. Стань первым!', add: 'Добавить', close: 'Закрыть', newPlaylist: 'Новый плейлист', plName: 'Название плейлиста', cancel: 'Отмена', create: 'Создать' },
    en: { main: 'Home', all: 'All Tracks', comments: 'Comments', admin: 'Admin Panel', playlists: 'Playlists', liked: 'Liked', settings: 'Settings', logout: 'Logout', search: 'Search...', addTrack: 'Add Track', title: 'Title', artist: 'Artist', category: 'Category', audioUrl: 'Audio URL', coverUrl: 'Cover URL', emptyComments: 'No comments yet. Be the first!', add: 'Add', close: 'Close', newPlaylist: 'New Playlist', plName: 'Playlist name', cancel: 'Cancel', create: 'Create' }
};
let currentLang = localStorage.getItem('te_lang') || 'ru';
const presetAvatars = ['😎','🔥','🎧','🎵','🚀','👾','🐉','🍕','👑','😈','🤖','🦊','🐼','🦁','🍀','🌙','⚡','💎','🎸','🎹'];
const presetColors = ['#1e293b', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#000000', '#ffffff'];

const globalAudio = new Audio();
let currentTrackId = null; let allTracksData = []; let allCommentsData = []; let allProfilesData = []; let allRepliesData = []; 
let currentCategory = 'Главное меню'; let ratingTrackId = null; let currentUserRating = null;
let previousVolume = 1; let currentUserId = null; let currentUserProfile = null; let isAdmin = false;
let isShuffle = false; let repeatMode = 0; let currentSort = 'rating'; let currentCommentsSort = 'likes'; 
let confirmCallback = null; let searchQuery = '';
let userPlaylists = []; let currentTrackToAddToPlaylist = null; let allPlaylistTracksData = [];
let selectedEmojiAvatar = null;
let selectedAvatarBg = '#1e293b';

// --- ПЕРЕХВАТ ОШИБОК ---
window.onerror = function(message, source, lineno, colno, error) {
    const msg = `Ошибка JS: ${message} (строка ${lineno})`;
    showToast(msg, 'error');
    console.error(message, source, lineno, colno, error);
    return false;
};

function escapeHtml(str) { if (str === null || str === undefined) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container'); 
    if(!container) return;
    const toast = document.createElement('div');
    const borderColor = type === 'success' ? 'border-cyan-500' : 'border-red-500'; 
    const textColor = type === 'success' ? 'text-cyan-400' : 'text-red-400';
    const icon = type === 'success' ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>` : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    toast.className = `bg-gray-800 text-white px-6 py-3 rounded-xl shadow-2xl border-l-4 ${borderColor} flex items-center gap-3 transition-all duration-300 translate-y-[-20px] opacity-0 pointer-events-auto`;
    toast.innerHTML = `<div class="${textColor}">${icon}</div><span class="font-medium text-sm">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-[-20px]', 'opacity-0'), 10);
    setTimeout(() => { toast.classList.add('translate-y-[-20px]', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function formatTime(seconds) { if (isNaN(seconds)) return "0:00"; const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${mins}:${secs < 10 ? '0' : ''}${secs}`; }
window.toggleMobileMenu = () => document.getElementById('sidebar').classList.toggle('open');

// --- ИНИЦИАЛИЗАЦИЯ ---
async function initApp() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUserId = session.user.id;
            await updateProfileUI();
        }
        await loadData();
    } catch (err) {
        console.error("Init Error:", err);
        showToast("Ошибка при запуске: " + err.message, 'error');
    }
}
initApp();

supabase.auth.onAuthStateChange(async (event, session) => { 
    if (event === 'SIGNED_IN') { 
        currentUserId = session.user.id; 
        await updateProfileUI(); 
        await loadData(); 
    } else if (event === 'SIGNED_OUT') { 
        currentUserId = null; currentUserProfile = null; isAdmin = false; 
        await updateProfileUI(); 
        await loadData(); 
    } 
});

// --- ПОДТВЕРЖДЕНИЕ ---
window.showConfirm = function(text, callback, type = 'delete') {
    document.getElementById('confirm-text').innerText = text; 
    confirmCallback = callback;
    const iconSvg = document.getElementById('confirm-icon');
    const iconContainer = document.getElementById('confirm-icon-container');
    const actionBtn = document.getElementById('confirm-action-btn');

    if (type === 'admin') {
        iconSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>`;
        iconSvg.className = "w-8 h-8 text-cyan-500";
        iconContainer.className = "w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4";
        actionBtn.className = "flex-1 px-4 py-2.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-colors shadow-lg active:scale-95";
    } else {
        iconSvg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>`;
        iconSvg.className = "w-8 h-8 text-red-500";
        iconContainer.className = "w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4";
        actionBtn.className = "flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 hover:bg-red-400 text-white transition-colors shadow-lg active:scale-95";
    }
    document.getElementById('confirm-modal').classList.remove('hidden'); 
}
window.closeConfirmModal = function() { document.getElementById('confirm-modal').classList.add('hidden'); confirmCallback = null; }
window.executeConfirm = async function() { if (confirmCallback) await confirmCallback(); closeConfirmModal(); }

// --- ШАРИНГ ---
window.shareTrack = function(trackId, event) { event.stopPropagation(); const url = `${window.location.origin}${window.location.pathname}?track=${trackId}`; navigator.clipboard.writeText(url).then(() => showToast(currentLang === 'ru' ? 'Ссылка на трек скопирована!' : 'Track link copied!', 'success')); }
window.shareCurrentPlaylist = function() { if (!currentCategory.startsWith('Playlist_')) return; const plId = currentCategory.split('_')[1]; const url = `${window.location.origin}${window.location.pathname}?playlist=${plId}`; navigator.clipboard.writeText(url).then(() => showToast(currentLang === 'ru' ? 'Ссылка на плейлист скопирована!' : 'Playlist link copied!', 'success')); }

// --- ПОДДЕРЖКА ---
window.openSupportModal = function() { if (!currentUserId) return showToast('Войдите, чтобы написать в поддержку', 'error'); document.getElementById('support-modal').classList.remove('hidden'); }
window.closeSupportModal = function() { document.getElementById('support-modal').classList.add('hidden'); }
window.submitSupport = async function() {
    const type = document.getElementById('support-type').value;
    const message = document.getElementById('support-message').value.trim();
    if (!message) return showToast('Напишите сообщение', 'error');
    try {
        const { error } = await supabase.from('reports').insert({ user_id: currentUserId, type, message });
        if (error) throw error;
        showToast('Сообщение отправлено! Спасибо.', 'success'); 
        document.getElementById('support-message').value = ''; 
        closeSupportModal(); 
    } catch(err) {
        showToast('Ошибка отправки: ' + err.message, 'error');
    }
}

// --- ЯЗЫКИ ---
window.changeLanguage = function(lang) { currentLang = lang; localStorage.setItem('te_lang', lang); applyLanguage(); showToast(lang === 'ru' ? 'Язык изменен' : 'Language changed', 'success'); }
function applyLanguage() {
    try {
        const t = translations[currentLang];
        if(document.getElementById('nav-main')) document.getElementById('nav-main').innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>${t.main}`;
        if(document.getElementById('nav-all')) document.getElementById('nav-all').innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>${t.all}`;
        if(document.getElementById('nav-comments')) document.getElementById('nav-comments').innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>${t.comments}`;
        if(document.getElementById('nav-admin')) document.getElementById('nav-admin').innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>${t.admin}`;
        
        // Кнопка "Мне понравилось" теперь рендерится в renderSidebarPlaylists, поэтому мы просто обновляем ее текст, если она есть
        const navLiked = document.getElementById('nav-liked');
        if(navLiked) navLiked.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>${t.liked}`;

        if(document.getElementById('search-input')) document.getElementById('search-input').placeholder = t.search;
        const langSelect = document.getElementById('settings-language'); if(langSelect) langSelect.value = currentLang;
        const addFormTitle = document.querySelector('#admin-view-container h3'); if(addFormTitle) addFormTitle.innerText = t.addTrack;
        const inputs = ['add-track-title', 'add-track-artist', 'add-track-category', 'add-track-audio', 'add-track-cover'];
        const placeholders = [t.title, t.artist, t.category, t.audioUrl, t.coverUrl];
        inputs.forEach((id, i) => { const el = document.getElementById(id); if(el) el.placeholder = placeholders[i]; });
        const plModalTitle = document.querySelector('#create-playlist-modal h3'); if(plModalTitle) plModalTitle.innerText = t.newPlaylist;
        const plModalInput = document.getElementById('new-playlist-name'); if(plModalInput) plModalInput.placeholder = t.plName;
        
        renderCategories(); 
        renderView();
    } catch (err) {
        console.error("Language error:", err);
    }
}
window.handleSearch = function(val) { searchQuery = val.toLowerCase().trim(); renderView(); }

// --- ПРОФИЛИ ---
async function fetchProfile(userId) { 
    try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single(); 
        if(error) throw error;
        return data || { id: userId, username: 'User_' + userId.substring(0, 4), avatar_url: null, avatar_bg: '#1e293b', is_admin: false, language: 'ru' }; 
    } catch(err) {
        return { id: userId, username: 'User_' + userId.substring(0, 4), avatar_url: null, avatar_bg: '#1e293b', is_admin: false, language: 'ru' }; 
    }
}

async function updateProfileUI() {
    if (!currentUserId) { 
        document.getElementById('login-btn').classList.remove('hidden'); 
        document.getElementById('user-profile').classList.add('hidden'); 
        document.getElementById('nav-admin').classList.add('hidden'); 
        isAdmin = false; 
        return; 
    }
    currentUserProfile = await fetchProfile(currentUserId);
    const session = await supabase.auth.getSession(); 
    const userEmail = session.data.session?.user?.email;
    isAdmin = (userEmail === MASTER_ADMIN_EMAIL) || currentUserProfile.is_admin;
    
    document.getElementById('login-btn').classList.add('hidden'); 
    document.getElementById('user-profile').classList.remove('hidden');
    document.getElementById('user-username-display').innerText = currentUserProfile.username; 
    document.getElementById('user-email-display').innerText = userEmail;
    
    const avatarBtn = document.getElementById('header-avatar-btn');
    const avatarImg = document.getElementById('user-avatar-img'); 
    const avatarLetter = document.getElementById('user-avatar-letter');
    const adminBadge = document.getElementById('admin-badge-header'); 
    const navAdmin = document.getElementById('nav-admin');
    
    avatarBtn.style.backgroundColor = currentUserProfile.avatar_bg || '#1e293b';
    const isUrl = currentUserProfile.avatar_url && currentUserProfile.avatar_url.startsWith('http');
    if (isUrl) {
        avatarImg.src = currentUserProfile.avatar_url; 
        avatarImg.classList.remove('hidden'); 
        avatarLetter.classList.add('hidden');
        avatarBtn.style.color = 'black';
    } else if (currentUserProfile.avatar_url) {
        avatarImg.classList.add('hidden'); 
        avatarLetter.classList.remove('hidden'); 
        avatarLetter.innerText = currentUserProfile.avatar_url;
        avatarBtn.style.color = (currentUserProfile.avatar_bg === '#ffffff' || currentUserProfile.avatar_bg === '#f59e0b' || currentUserProfile.avatar_bg === '#10b981' || currentUserProfile.avatar_bg === '#06b6d4') ? 'black' : 'white';
    } else {
        avatarImg.classList.add('hidden'); 
        avatarLetter.classList.remove('hidden'); 
        avatarLetter.innerText = currentUserProfile.username.charAt(0).toUpperCase();
        avatarBtn.style.color = 'white';
    }
    
    if (isAdmin) { 
        avatarBtn.classList.add('ring-2', 'ring-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.5)]'); 
        adminBadge.classList.remove('hidden'); 
        navAdmin.classList.remove('hidden'); 
    } else { 
        avatarBtn.classList.remove('ring-2', 'ring-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.5)]'); 
        adminBadge.classList.add('hidden'); 
        navAdmin.classList.add('hidden'); 
    }
    updateProfilePreview();
}

function updateProfilePreview() {
    const previewImg = document.getElementById('settings-avatar-preview'); 
    const previewLetter = document.getElementById('settings-avatar-letter'); 
    const previewEmoji = document.getElementById('settings-avatar-emoji');
    const container = document.getElementById('settings-avatar-container');
    if(!container) return;
    
    container.style.backgroundColor = selectedAvatarBg || '#1e293b';
    let currentAvatar = selectedEmojiAvatar || currentUserProfile?.avatar_url;
    
    if (currentAvatar && currentAvatar.startsWith('http')) {
        previewImg.src = currentAvatar; previewImg.classList.remove('hidden'); previewLetter.classList.add('hidden'); previewEmoji.classList.add('hidden');
    } else if (currentAvatar) {
        previewImg.classList.add('hidden'); previewLetter.classList.add('hidden'); previewEmoji.innerText = currentAvatar; previewEmoji.classList.remove('hidden');
        previewEmoji.style.color = (selectedAvatarBg === '#ffffff' || selectedAvatarBg === '#f59e0b' || selectedAvatarBg === '#10b981' || selectedAvatarBg === '#06b6d4') ? 'black' : 'white';
    } else {
        previewImg.classList.add('hidden'); previewEmoji.classList.add('hidden'); previewLetter.innerText = currentUserProfile ? currentUserProfile.username.charAt(0).toUpperCase() : 'U'; previewLetter.classList.remove('hidden');
        previewLetter.style.color = 'white';
    }
}

window.openProfileModal = function() { 
    if (!currentUserProfile) return showToast('Сначала войдите в аккаунт', 'error'); 
    selectedEmojiAvatar = null;
    selectedAvatarBg = currentUserProfile.avatar_bg || '#1e293b';
    document.getElementById('settings-username').value = currentUserProfile.username; 
    
    document.getElementById('emoji-avatar-picker').innerHTML = presetAvatars.map(emoji => 
        `<button onclick="setEmojiAvatar('${emoji}')" class="text-2xl hover:scale-125 hover:bg-white/10 rounded-lg p-1 transition-all ${currentUserProfile.avatar_url === emoji ? 'bg-cyan-500/20 neon-border' : ''}">${emoji}</button>`
    ).join('');

    document.getElementById('bg-color-picker').innerHTML = presetColors.map(color => 
        `<button onclick="setAvatarBg('${color}')" class="w-8 h-8 rounded-full border-2 border-white/20 hover:scale-110 transition-all ${selectedAvatarBg === color ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900' : ''}" style="background-color: ${color}"></button>`
    ).join('');

    updateProfilePreview();
    document.getElementById('profile-modal').classList.remove('hidden'); 
}
window.closeProfileModal = () => document.getElementById('profile-modal').classList.add('hidden');

window.setEmojiAvatar = function(emoji) {
    selectedEmojiAvatar = emoji; updateProfilePreview();
    document.querySelectorAll('#emoji-avatar-picker button').forEach(btn => {
        btn.className = btn.innerText === emoji ? 'text-2xl hover:scale-125 hover:bg-white/10 rounded-lg p-1 transition-all bg-cyan-500/20 neon-border' : 'text-2xl hover:scale-125 hover:bg-white/10 rounded-lg p-1 transition-all';
    });
}
window.setAvatarBg = function(color) {
    selectedAvatarBg = color; updateProfilePreview();
    document.querySelectorAll('#bg-color-picker button').forEach(btn => {
        const isSel = btn.style.backgroundColor === color || btn.style.backgroundColor === `rgb(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)})`;
        btn.className = isSel ? 'w-8 h-8 rounded-full border-2 border-white/20 hover:scale-110 transition-all ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900' : 'w-8 h-8 rounded-full border-2 border-white/20 hover:scale-110 transition-all';
    });
}

window.saveProfile = async function() {
    const newUsername = document.getElementById('settings-username').value.trim(); 
    if (!newUsername) return showToast('Никнейм не может быть пустым', 'error');
    const fileInput = document.getElementById('settings-avatar-file');
    let avatarUrl = selectedEmojiAvatar || currentUserProfile.avatar_url;
    
    try {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0]; const fileExt = file.name.split('.').pop(); const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
            showToast('Загрузка аватарки...', 'success');
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = publicUrlData.publicUrl;
        }

        const { error } = await supabase.from('profiles').upsert({ id: currentUserId, username: newUsername, avatar_url: avatarUrl, avatar_bg: selectedAvatarBg, language: currentLang });
        if (error) {
            if (error.code === '23505') throw new Error('Этот никнейм уже занят!');
            throw error;
        }
        
        showToast('Профиль обновлён!', 'success'); 
        closeProfileModal(); 
        await updateProfileUI(); 
        await loadData(); 
    } catch(err) {
        showToast(err.message, 'error');
    }
}

window.openLoginModal = () => document.getElementById('login-modal').classList.remove('hidden');
window.closeLoginModal = () => document.getElementById('login-modal').classList.add('hidden');

window.handleLogin = async function() {
    const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value;
    if(!email || !password) return showToast("Введи email и пароль!", "error");
    
    try {
        let { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error && error.message.includes('Invalid login credentials')) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) throw signUpError;
            showToast('Аккаунт создан!', 'success'); closeLoginModal();
        } else if (error) { 
            throw error;
        } else { 
            showToast('Успешный вход!', 'success'); 
            closeLoginModal(); 
        }
    } catch (err) {
        showToast('Ошибка: ' + err.message, 'error');
    }
}

window.handlePasswordReset = async function() {
    const email = document.getElementById('login-email').value;
    if (!email) return showToast('Введи email для сброса!', 'error');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    if (error) showToast('Ошибка: ' + error.message, 'error'); else showToast('Инструкция отправлена на почту!', 'success');
}
window.logout = async function() { await supabase.auth.signOut(); showToast('Вы вышли', 'success'); }

// --- АДМИН ПАНЕЛЬ ---
window.adminAddTrack = async function() {
    if (!isAdmin) return;
    const title = document.getElementById('add-track-title').value.trim(); const artist = document.getElementById('add-track-artist').value.trim();
    const category = document.getElementById('add-track-category').value.trim(); const audio_url = document.getElementById('add-track-audio').value.trim(); const cover_url = document.getElementById('add-track-cover').value.trim();
    if (!title || !audio_url) return showToast('Название и аудио обязательны', 'error');
    const { error } = await supabase.from('tracks').insert({ title, artist, category, audio_url, cover_url });
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast('Трек добавлен!', 'success'); document.getElementById('add-track-title').value = ''; document.getElementById('add-track-artist').value = ''; document.getElementById('add-track-category').value = ''; document.getElementById('add-track-audio').value = ''; document.getElementById('add-track-cover').value = ''; await loadData(); }
}
window.toggleAdminStatus = async function(targetUserId, currentStatus) {
    if (!isAdmin) return;
    showConfirm(currentStatus ? 'Снять права администратора?' : 'Выдать права администратора?', async () => {
        const { error } = await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', targetUserId);
        if (error) showToast('Ошибка: ' + error.message, 'error'); else { showToast('Права обновлены!', 'success'); await loadData(); }
    }, 'admin'); 
}

// --- ПЛЕЙЛИСТЫ ---
window.openCreatePlaylistModal = function() { if (!currentUserId) return showToast('Войди, чтобы создавать плейлисты', 'error'); document.getElementById('create-playlist-modal').classList.remove('hidden'); }
window.closeCreatePlaylistModal = () => document.getElementById('create-playlist-modal').classList.add('hidden');
window.createPlaylist = async function() {
    const name = document.getElementById('new-playlist-name').value.trim();
    if (!name) return showToast('Введи название', 'error');
    const { error } = await supabase.from('playlists').insert({ user_id: currentUserId, name });
    if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast('Плейлист создан', 'success'); closeCreatePlaylistModal(); document.getElementById('new-playlist-name').value = ''; await loadData(); }
}
window.deletePlaylist = function(playlistId, event) {
    event.stopPropagation();
    showConfirm('Удалить этот плейлист?', async () => {
        const { error } = await supabase.from('playlists').delete().match({ id: playlistId, user_id: currentUserId });
        if (error) showToast('Ошибка: ' + error.message, 'error');
        else { showToast('Плейлист удален', 'success'); if (currentCategory === `Playlist_${playlistId}`) changeCategory('Главное меню'); await loadData(); }
    }, 'delete');
}
window.openAddToPlaylistModal = function(trackId) {
    if (!currentUserId) return showToast('Войди!', 'error');
    currentTrackToAddToPlaylist = trackId; const container = document.getElementById('playlists-to-add-container');
    if (userPlaylists.length === 0) container.innerHTML = `<p class="text-sm text-gray-400 text-center py-4">У вас пока нет плейлистов.</p>`;
    else container.innerHTML = userPlaylists.map(pl => `<button onclick="addTrackToPlaylist(${pl.id})" class="w-full text-left px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm font-bold text-white neon-border">${escapeHtml(pl.name)}</button>`).join('');
    document.getElementById('add-to-playlist-modal').classList.remove('hidden');
}
window.closeAddToPlaylistModal = () => document.getElementById('add-to-playlist-modal').classList.add('hidden');
window.addTrackToPlaylist = async function(playlistId) {
    const { error } = await supabase.from('playlist_tracks').insert({ playlist_id: playlistId, track_id: currentTrackToAddToPlaylist });
    if (error && error.code === '23505') showToast('Трек уже есть в этом плейлисте', 'error');
    else if (error) showToast('Ошибка: ' + error.message, 'error');
    else { showToast('Добавлено в плейлист!', 'success'); closeAddToPlaylistModal(); await loadData(); }
}

// --- ПЛЕЕР ---
window.playTrack = function(trackId, startTime = 0, playImmediately = true) {
    const track = allTracksData.find(t => t.id === trackId); if (!track) return;
    if (currentTrackId === trackId && playImmediately) { toggleGlobalPlay(); return; }
    currentTrackId = trackId; globalAudio.src = track.audio_url; 
    if (playImmediately) globalAudio.play(); else globalAudio.pause();
    document.getElementById('global-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = track.title; document.getElementById('player-artist').innerText = track.artist || 'TrueEstimation';
    const coverImg = document.getElementById('player-cover'); if(track.cover_url) { coverImg.src = track.cover_url; coverImg.style.display = 'block'; } else { coverImg.style.display = 'none'; }
    if (startTime > 0) { globalAudio.addEventListener('loadedmetadata', () => { globalAudio.currentTime = startTime; }, { once: true }); }
    updateAllPlayIcons(); updateGlobalPlayPauseIcon(playImmediately);
}
window.toggleGlobalPlay = function() { 
    if (!currentTrackId) return; 
    if (globalAudio.paused) { globalAudio.play(); updateGlobalPlayPauseIcon(true); } 
    else { globalAudio.pause(); updateGlobalPlayPauseIcon(false); } 
    updateAllPlayIcons(); updateVolumeUI();
}
window.playNext = function() { if (!currentTrackId || allTracksData.length === 0) return; if (repeatMode === 2) { globalAudio.currentTime = 0; globalAudio.play(); return; } let nextIndex; if (isShuffle) { nextIndex = Math.floor(Math.random() * allTracksData.length); } else { const currentIndex = allTracksData.findIndex(t => t.id === currentTrackId); nextIndex = currentIndex + 1; if (nextIndex >= allTracksData.length) { if (repeatMode === 1) nextIndex = 0; else { globalAudio.pause(); updateGlobalPlayPauseIcon(false); updateAllPlayIcons(); return; } } } playTrack(allTracksData[nextIndex].id); }
window.playPrev = function() { if (!currentTrackId || allTracksData.length === 0) return; if (repeatMode === 2) { globalAudio.currentTime = 0; globalAudio.play(); return; } let prevIndex; if (isShuffle) { prevIndex = Math.floor(Math.random() * allTracksData.length); } else { const currentIndex = allTracksData.findIndex(t => t.id === currentTrackId); prevIndex = currentIndex - 1; if (prevIndex < 0) { if (repeatMode === 1) prevIndex = allTracksData.length - 1; else prevIndex = 0; } } playTrack(allTracksData[prevIndex].id); }
window.toggleShuffle = function() { isShuffle = !isShuffle; const btn = document.getElementById('shuffle-btn'); if (isShuffle) { btn.classList.add('text-cyan-500'); btn.classList.remove('text-gray-400'); } else { btn.classList.remove('text-cyan-500'); btn.classList.add('text-gray-400'); } }
window.toggleRepeat = function() { repeatMode = (repeatMode + 1) % 3; const btn = document.getElementById('repeat-btn'); const badge = document.getElementById('repeat-badge'); btn.classList.remove('text-cyan-500', 'text-gray-400'); badge.classList.add('hidden'); if (repeatMode === 0) btn.classList.add('text-gray-400'); else if (repeatMode === 1) btn.classList.add('text-cyan-500'); else if (repeatMode === 2) { btn.classList.add('text-cyan-500'); badge.classList.remove('hidden'); } }
window.openCoverModal = function() { if (!currentTrackId) return; const track = allTracksData.find(t => t.id === currentTrackId); if (!track || !track.cover_url) return; document.getElementById('cover-modal-img').src = track.cover_url; document.getElementById('cover-modal').classList.remove('hidden'); }
window.closeCoverModal = () => document.getElementById('cover-modal').classList.add('hidden');

function updateAllPlayIcons() { document.querySelectorAll('.card-play-icon').forEach(icon => { icon.innerHTML = `<path class="ml-0.5" d="M8 5v14l11-7z"/>`; }); if (currentTrackId && !globalAudio.paused) { document.querySelectorAll(`.card-icon-${currentTrackId}`).forEach(icon => { icon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; }); } }
function updateGlobalPlayPauseIcon(isPlaying) { 
    const icon = document.getElementById('global-play-icon'); 
    if (isPlaying) { icon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; icon.classList.remove('ml-0.5'); } 
    else { icon.innerHTML = `<path d="M8 5v14l11-7z"/>`; icon.classList.add('ml-0.5'); } 
    document.querySelectorAll('#volume-eq .eq-bar').forEach(bar => isPlaying ? bar.classList.remove('paused') : bar.classList.add('paused'));
}
document.getElementById('progress-container').addEventListener('mousedown', function(e) { if (e.target.tagName.toLowerCase() === 'input') return; const rect = this.getBoundingClientRect(); const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); if (globalAudio.duration) { const newTime = percent * globalAudio.duration; globalAudio.currentTime = newTime; document.getElementById('global-progress-bar').style.width = `${percent * 100}%`; document.getElementById('global-slider').value = newTime; document.getElementById('global-current-time').innerText = formatTime(newTime); updateThumbPosition('progress', percent); } });
document.getElementById('volume-container').addEventListener('mousedown', function(e) { if (e.target.tagName.toLowerCase() === 'input') return; const rect = this.getBoundingClientRect(); const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); changeVolume(percent); updateThumbPosition('volume', percent); });
function updateThumbPosition(type, percent) { const thumb = document.getElementById(`${type}-thumb`); if (thumb) { thumb.style.left = `${percent * 100}%`; if (type === 'volume' && percent === 0) thumb.style.opacity = '0'; else if (percent > 0) thumb.style.opacity = '1'; } }
globalAudio.addEventListener('timeupdate', () => { if (!globalAudio.duration) return; const percent = (globalAudio.currentTime / globalAudio.duration) * 100; document.getElementById('global-progress-bar').style.width = `${percent}%`; document.getElementById('global-slider').value = globalAudio.currentTime; document.getElementById('global-current-time').innerText = formatTime(globalAudio.currentTime); updateThumbPosition('progress', percent / 100); });
globalAudio.addEventListener('loadedmetadata', () => { document.getElementById('global-duration').innerText = formatTime(globalAudio.duration); document.getElementById('global-slider').max = globalAudio.duration; });
globalAudio.addEventListener('ended', () => { if (repeatMode === 2) { globalAudio.currentTime = 0; globalAudio.play(); } else { playNext(); } });
window.seekGlobalAudio = function(value) { globalAudio.currentTime = value; if (globalAudio.duration) { const percent = value / globalAudio.duration; document.getElementById('global-progress-bar').style.width = `${percent * 100}%`; updateThumbPosition('progress', percent); } }

function updateVolumeUI() {
    const eq = document.getElementById('volume-eq'); const muteIcon = document.getElementById('volume-mute-icon');
    if (globalAudio.volume === 0 || globalAudio.muted) { eq.classList.add('hidden'); muteIcon.classList.remove('hidden'); } 
    else { eq.classList.remove('hidden'); muteIcon.classList.add('hidden'); }
}
window.changeVolume = function(value) { 
    value = parseFloat(value); globalAudio.volume = value; if (value > 0) previousVolume = value; localStorage.setItem('te_volume', value); 
    document.getElementById('volume-progress-bar').style.width = `${value * 100}%`; document.getElementById('global-volume-slider').value = value; 
    updateThumbPosition('volume', value); updateVolumeUI();
}
window.toggleMute = function() { if (globalAudio.volume > 0) { changeVolume(0); } else { changeVolume(previousVolume || 0.5); } }
const savedVol = parseFloat(localStorage.getItem('te_volume')); 
if (!isNaN(savedVol)) { globalAudio.volume = savedVol; previousVolume = savedVol > 0 ? savedVol : 1; document.getElementById('global-volume-slider').value = savedVol; document.getElementById('volume-progress-bar').style.width = `${savedVol * 100}%`; setTimeout(() => { changeVolume(savedVol); updateVolumeUI(); }, 100); }
window.addEventListener('beforeunload', () => { if (currentTrackId) { localStorage.setItem('te_trackId', currentTrackId); localStorage.setItem('te_currentTime', globalAudio.currentTime); } });
globalAudio.addEventListener('pause', () => { if (currentTrackId) { localStorage.setItem('te_trackId', currentTrackId); localStorage.setItem('te_currentTime', globalAudio.currentTime); } updateVolumeUI(); });
globalAudio.addEventListener('play', updateVolumeUI);

// --- ОЦЕНКА И КОММЕНТАРИИ ---
window.openRatingModal = function(trackId) { const track = allTracksData.find(t => t.id === trackId); if (!track) return; ratingTrackId = trackId; document.getElementById('modal-track-title').innerText = track.title; document.getElementById('modal-track-artist').innerText = track.artist || 'TrueEstimation'; const coverImg = document.getElementById('modal-track-cover'); if(track.cover_url) { coverImg.src = track.cover_url; coverImg.style.display = 'block'; } else { coverImg.style.display = 'none'; } currentUserRating = track.userRating; const deleteBtn = document.getElementById('delete-rating-btn'); if (currentUserRating) { for(let i=1; i<=5; i++) document.getElementById(`crit-${i}`).value = 3; document.getElementById('rating-comment').value = currentUserRating.comment || ''; deleteBtn.classList.remove('hidden'); } else { for(let i=1; i<=5; i++) { document.getElementById(`crit-${i}`).value = 3; document.getElementById(`val-crit-${i}`).innerText = '3 / 6'; } document.getElementById('rating-comment').value = ''; deleteBtn.classList.add('hidden'); } updateTotalScore(); document.getElementById('rating-modal').classList.remove('hidden'); }
window.closeRatingModal = function() { document.getElementById('rating-modal').classList.add('hidden'); ratingTrackId = null; currentUserRating = null; }
window.updateTotalScore = function() { let total = 0; for(let i=1; i<=5; i++) { const val = parseInt(document.getElementById(`crit-${i}`).value); document.getElementById(`val-crit-${i}`).innerText = `${val} / 6`; total += val; } document.getElementById('modal-total-score').innerText = total; }
window.submitRating = async function() { if (!ratingTrackId) return; const { data: { session } } = await supabase.auth.getSession(); if (!session) { showToast('Сначала войди!', 'error'); closeRatingModal(); return; } let totalScore = 0; for(let i=1; i<=5; i++) totalScore += parseInt(document.getElementById(`crit-${i}`).value); const commentText = document.getElementById('rating-comment').value.trim(); const { error } = await supabase.from('ratings').upsert({ user_id: session.user.id, track_id: ratingTrackId, score: totalScore, comment: commentText || null }, { onConflict: 'user_id, track_id' }); if (error) showToast('Ошибка: ' + error.message, 'error'); else { showToast('Оценка сохранена!', 'success'); closeRatingModal(); await loadData(); } }
window.promptDeleteRating = function() { if (!ratingTrackId || !currentUserRating) return; showConfirm('Удалить свою оценку?', async () => { const { error } = await supabase.from('ratings').delete().match({ id: currentUserRating.id }); if (error) showToast('Ошибка: ' + error.message, 'error'); else { showToast('Удалено', 'success'); closeRatingModal(); await loadData(); } }, 'delete'); }
window.promptDeleteComment = function(ratingId) { showConfirm('Удалить этот комментарий?', async () => { const { error } = await supabase.from('ratings').delete().match({ id: ratingId }); if (error) showToast('Ошибка (возможно, нет прав): ' + error.message, 'error'); else { showToast('Удалено', 'success'); await loadData(); } }, 'delete'); }
window.likeTrack = async function(trackId, event) { event.stopPropagation(); if (!currentUserId) return showToast('Войди!', 'error'); const track = allTracksData.find(t => t.id === trackId); if (!track) return; const wasLiked = track.userLiked; track.userLiked = !wasLiked; track.likesCount += wasLiked ? -1 : 1; renderTracksList(); if (wasLiked) { const { error } = await supabase.from('track_likes').delete().match({ user_id: currentUserId, track_id: trackId }); if (error) { track.userLiked = true; track.likesCount++; renderTracksList(); } } else { const { error } = await supabase.from('track_likes').insert({ user_id: currentUserId, track_id: trackId }); if (error) { track.userLiked = false; track.likesCount--; renderTracksList(); } } }
window.likeComment = async function(ratingId, event) { event.stopPropagation(); if (!currentUserId) return showToast('Войди!', 'error'); const comment = allCommentsData.find(c => c.id === ratingId); if (!comment) return; const wasLiked = comment.userLiked; comment.userLiked = !wasLiked; comment.likesCount += wasLiked ? -1 : 1; renderCommentsView(); if (wasLiked) { const { error } = await supabase.from('comment_likes').delete().match({ user_id: currentUserId, rating_id: ratingId }); if (error) { comment.userLiked = true; comment.likesCount++; renderCommentsView(); } } else { const { error } = await supabase.from('comment_likes').insert({ user_id: currentUserId, rating_id: ratingId }); if (error) { comment.userLiked = false; comment.likesCount--; renderCommentsView(); } } }
window.likeReply = async function(replyId, event) { event.stopPropagation(); if (!currentUserId) return showToast('Войди!', 'error'); const reply = allRepliesData.find(r => r.id === replyId); if (!reply) return; const wasLiked = reply.userLiked; reply.userLiked = !wasLiked; reply.likesCount += wasLiked ? -1 : 1; renderCommentsView(); if (wasLiked) { const { error } = await supabase.from('reply_likes').delete().match({ user_id: currentUserId, reply_id: replyId }); if (error) { reply.userLiked = true; reply.likesCount++; renderCommentsView(); } } else { const { error } = await supabase.from('reply_likes').insert({ user_id: currentUserId, reply_id: replyId }); if (error) { reply.userLiked = false; reply.likesCount--; renderCommentsView(); } } }
window.toggleReplyBox = function(ratingId) { const box = document.getElementById(`reply-box-${ratingId}`); if (box) { box.classList.toggle('hidden'); if (!box.classList.contains('hidden')) document.getElementById(`reply-input-${ratingId}`).focus(); } }
window.replyToUser = function(commentId, username) { document.getElementById(`reply-box-${commentId}`).classList.remove('hidden'); const input = document.getElementById(`reply-input-${commentId}`); input.value = `@${username} `; input.focus(); }
window.submitReply = async function(ratingId) { if (!currentUserId) return showToast('Войди!', 'error'); const input = document.getElementById(`reply-input-${ratingId}`); const text = input.value.trim(); if (!text) return; const { error } = await supabase.from('replies').insert({ rating_id: ratingId, user_id: currentUserId, content: text }); if (error) showToast('Ошибка: ' + error.message, 'error'); else { showToast('Ответ добавлен', 'success'); input.value = ''; await loadData(); } }
window.deleteReply = function(replyId) { showConfirm('Удалить этот ответ?', async () => { const { error } = await supabase.from('replies').delete().match({ id: replyId }); if (error) showToast('Ошибка: ' + error.message, 'error'); else { showToast('Удалено', 'success'); await loadData(); } }, 'delete'); }
window.changeSort = function(sortType) { currentSort = sortType; renderView(); }
window.changeCommentsSort = function(sortType) { currentCommentsSort = sortType; renderCommentsView(); }

// --- ЗАГРУЗКА ДАННЫХ ---
async function loadData() {
    try {
        const [tracksRes, ratingsRes, trackLikesRes, commentLikesRes, profilesRes, repliesRes, replyLikesRes, playlistsRes, playlistTracksRes] = await Promise.all([
            supabase.from('tracks').select('*'), supabase.from('ratings').select('*'), supabase.from('track_likes').select('*'), supabase.from('comment_likes').select('*'),
            supabase.from('profiles').select('*'), supabase.from('replies').select('*'), supabase.from('reply_likes').select('*'),
            currentUserId ? supabase.from('playlists').select('*').eq('user_id', currentUserId) : Promise.resolve({data: []}),
            currentUserId ? supabase.from('playlist_tracks').select('*') : Promise.resolve({data: []})
        ]);

        const tracks = tracksRes.data || []; const ratings = ratingsRes.data || []; const trackLikes = trackLikesRes.data || []; const commentLikes = commentLikesRes.data || [];
        allProfilesData = profilesRes.data || []; allRepliesData = repliesRes.data || []; const replyLikes = replyLikesRes.data || [];
        userPlaylists = playlistsRes.data || [];
        allPlaylistTracksData = playlistTracksRes.data || [];

        const ratingsByTrack = new Map(); ratings.forEach(r => { if (!ratingsByTrack.has(r.track_id)) ratingsByTrack.set(r.track_id, []); ratingsByTrack.get(r.track_id).push(r); });
        const likesByTrack = new Map(); trackLikes.forEach(l => { if (!likesByTrack.has(l.track_id)) likesByTrack.set(l.track_id, []); likesByTrack.get(l.track_id).push(l.user_id); });
        const likesByComment = new Map(); commentLikes.forEach(l => { if (!likesByComment.has(l.rating_id)) likesByComment.set(l.rating_id, []); likesByComment.get(l.rating_id).push(l.user_id); });
        const likesByReply = new Map(); replyLikes.forEach(l => { if (!likesByReply.has(l.reply_id)) likesByReply.set(l.reply_id, []); likesByReply.get(l.reply_id).push(l.user_id); });

        allTracksData = []; let totalGlobalVotes = 0;
        for (const track of tracks) {
            const tRatings = ratingsByTrack.get(track.id) || []; const tLikes = likesByTrack.get(track.id) || []; const votesCount = tRatings.length; totalGlobalVotes += votesCount;
            let avgScore = 0; if (votesCount > 0) { const sum = tRatings.reduce((acc, curr) => acc + curr.score, 0); avgScore = parseFloat((sum / votesCount).toFixed(1)); }
            let category = track.category; if (!category || category.trim() === "") category = 'Без категории';
            const userRatingObj = currentUserId ? tRatings.find(r => r.user_id === currentUserId) : null;
            allTracksData.push({ ...track, category, avgScore, votesCount, likesCount: tLikes.length, userLiked: currentUserId ? tLikes.includes(currentUserId) : false, userRating: userRatingObj });
        }

        allCommentsData = ratings.filter(r => r.comment && r.comment.trim() !== "").map(r => {
            const cLikes = likesByComment.get(r.id) || []; const track = tracks.find(t => t.id === r.track_id);
            const profile = allProfilesData.find(p => p.id === r.user_id) || { username: 'User', avatar_url: null, avatar_bg: '#1e293b', is_admin: false };
            const replies = allRepliesData.filter(rep => rep.rating_id === r.id).map(rep => {
                const repProfile = allProfilesData.find(p => p.id === rep.user_id) || { username: 'User', avatar_url: null, avatar_bg: '#1e293b', is_admin: false };
                const repLikes = likesByReply.get(rep.id) || [];
                return { ...rep, username: repProfile.username, avatar_url: repProfile.avatar_url, avatar_bg: repProfile.avatar_bg, isAdmin: repProfile.is_admin, isOwn: currentUserId === rep.user_id || isAdmin, likesCount: repLikes.length, userLiked: currentUserId ? repLikes.includes(currentUserId) : false };
            });
            return { ...r, likesCount: cLikes.length, userLiked: currentUserId ? cLikes.includes(currentUserId) : false, trackTitle: track ? track.title : 'Неизвестный трек', trackArtist: track ? track.artist : '', trackCover: track ? track.cover_url : '', isOwn: currentUserId === r.user_id || isAdmin, isAdmin: profile.is_admin, username: profile.username, avatar_url: profile.avatar_url, avatar_bg: profile.avatar_bg, replies: replies };
        });

        const statsEl = document.getElementById('stats-container');
        if(statsEl) statsEl.innerText = `${allTracksData.length} треков | ${totalGlobalVotes} оценок`;
        
        // ВЫЗЫВАЕМ ОТРИСОВКУ САЙДБАРА С ПЛЕЙЛИСТАМИ
        renderSidebarPlaylists();
        
        applyLanguage(); 
        renderView(); 

        const urlParams = new URLSearchParams(window.location.search);
        const sharedTrackId = urlParams.get('track');
        const sharedPlaylistId = urlParams.get('playlist');

        if (sharedTrackId) {
            setTimeout(() => { const track = allTracksData.find(t => t.id == sharedTrackId); if (track) { showToast(`Загружен трек по ссылке`, 'success'); changeCategory('Все'); setTimeout(() => playTrack(track.id), 500); } }, 1000);
        } else if (sharedPlaylistId) {
            setTimeout(() => { const pl = userPlaylists.find(p => p.id == sharedPlaylistId); if (pl) { showToast(`Загружен плейлист по ссылке`, 'success'); changeCategory(`Playlist_${pl.id}`); } }, 1000);
        }

        const savedTrackId = localStorage.getItem('te_trackId'); const savedTime = parseFloat(localStorage.getItem('te_currentTime'));
        if (savedTrackId && !currentTrackId) {
            const savedTrack = allTracksData.find(t => t.id == savedTrackId);
            if (savedTrack) {
                playTrack(savedTrack.id, savedTime || 0, false);
                setTimeout(() => { if (savedTime && globalAudio.duration) { document.getElementById('global-progress-bar').style.width = `${(savedTime / globalAudio.duration) * 100}%`; document.getElementById('global-slider').value = savedTime; document.getElementById('global-current-time').innerText = formatTime(savedTime); updateThumbPosition('progress', savedTime / globalAudio.duration); } }, 500);
            }
        }
    } catch (err) {
        console.error("Data Load Error:", err);
        showToast("Ошибка загрузки данных: " + err.message, 'error');
    }
}

// ОТДЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПЛЕЙЛИСТОВ В САЙДБАРЕ
function renderSidebarPlaylists() {
    const plContainer = document.getElementById('playlists-container');
    if(!plContainer) return;

    const t = translations[currentLang];
    let html = `
        <button onclick="changeCategory('Liked')" class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left" id="nav-liked">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            ${t.liked}
        </button>
    `;

    html += userPlaylists.map(pl => `
        <div class="flex items-center justify-between group/pl w-full rounded-xl hover:bg-white/10 transition-colors pr-2">
            <button onclick="changeCategory('Playlist_${pl.id}')" class="flex-1 flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-300 group-hover/pl:text-white text-left" id="nav-playlist-${pl.id}">
                <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
                <span class="truncate">${escapeHtml(pl.name)}</span>
            </button>
            <button onclick="deletePlaylist(${pl.id}, event)" class="opacity-0 group-hover/pl:opacity-100 text-gray-500 hover:text-red-400 p-1 transition-all" title="Удалить плейлист">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
        </div>
    `).join('');

    plContainer.innerHTML = html;
}

function renderCategories() {
    try {
        const container = document.getElementById('categories-container');
        if(!container) return;
        const dynamicCategories = Array.from(new Set(allTracksData.map(t => t.category).filter(c => c && c !== 'Все' && c.toLowerCase() !== 'треки')));
        
        if(document.getElementById('nav-main')) document.getElementById('nav-main').className = currentCategory === 'Главное меню' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left neon-text' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';
        if(document.getElementById('nav-all')) document.getElementById('nav-all').className = currentCategory === 'Все' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left neon-text' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';
        if(document.getElementById('nav-comments')) document.getElementById('nav-comments').className = currentCategory === 'Комментарии' ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left neon-text' : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';
        if(document.getElementById('nav-liked')) document.getElementById('nav-liked').className = currentCategory === 'Liked' ? 'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold bg-white/10 text-white transition-colors text-left neon-text' : 'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left';
        
        const adminBtnClass = currentCategory === 'AdminPanel' 
            ? 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 transition-colors text-left' 
            : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left';
        if(document.getElementById('nav-admin')) document.getElementById('nav-admin').className = isAdmin ? adminBtnClass : `${adminBtnClass} hidden`;

        userPlaylists.forEach(pl => {
            const el = document.getElementById(`nav-playlist-${pl.id}`);
            if (el) el.className = currentCategory === `Playlist_${pl.id}` ? 'flex-1 flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-cyan-400 text-left neon-text' : 'flex-1 flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-300 group-hover/pl:text-white text-left';
        });

        const htmlParts = dynamicCategories.map(cat => {
            const isActive = cat === currentCategory;
            const btnClass = isActive ? 'bg-white/10 text-white font-bold neon-text' : 'text-gray-300 hover:text-white hover:bg-white/5 font-medium';
            const safeCat = escapeHtml(cat); const catArg = escapeHtml(JSON.stringify(cat));
            return `<button onclick='changeCategory(${catArg})' class="w-full text-left px-4 py-2.5 rounded-xl transition-all text-sm ${btnClass}">${safeCat}</button>`;
        });
        container.innerHTML = htmlParts.join('');
    } catch(err) {
        console.error("Category Render Error:", err);
    }
}

window.changeCategory = function(cat) { 
    currentCategory = cat; 
    if(window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open'); 
    
    const shareHeader = document.getElementById('playlist-share-header');
    if (shareHeader) {
        if (cat.startsWith('Playlist_')) shareHeader.classList.remove('hidden');
        else shareHeader.classList.add('hidden');
    }

    renderCategories(); 
    renderView(); 
}

function renderView() {
    try {
        const heroContainer = document.getElementById('hero-container'); 
        const listViewContainer = document.getElementById('list-view-container');
        const commentsViewContainer = document.getElementById('comments-view-container'); 
        const adminViewContainer = document.getElementById('admin-view-container');
        
        if(!heroContainer || !listViewContainer || !commentsViewContainer || !adminViewContainer) return;

        heroContainer.classList.add('hidden'); listViewContainer.classList.add('hidden'); commentsViewContainer.classList.add('hidden'); adminViewContainer.classList.add('hidden');
        adminViewContainer.classList.remove('flex');

        if (currentCategory === 'Главное меню') { 
            heroContainer.classList.remove('hidden'); 
            renderHero(); 
        } else if (currentCategory === 'Комментарии') { 
            commentsViewContainer.classList.remove('hidden'); 
            renderCommentsView(); 
        } else if (currentCategory === 'AdminPanel') {
            if (!isAdmin) { changeCategory('Главное меню'); return; }
            adminViewContainer.classList.remove('hidden'); 
            adminViewContainer.classList.add('flex'); 
            renderAdminPanel();
        } else {
            listViewContainer.classList.remove('hidden');
            if (currentCategory === 'Liked') document.getElementById('current-category-title').innerText = translations[currentLang].liked;
            else if (currentCategory.startsWith('Playlist_')) {
                const plId = currentCategory.split('_')[1];
                const pl = userPlaylists.find(p => p.id == plId);
                document.getElementById('current-category-title').innerText = pl ? pl.name : 'Плейлист';
            }
            else document.getElementById('current-category-title').innerText = currentCategory === 'Все' ? translations[currentLang].all : currentCategory;
            
            const sortEl = document.getElementById('sort-select');
            if(sortEl) sortEl.value = currentSort; 
            renderTracksList();
        }
    } catch(err) {
        console.error("View Render Error:", err);
    }
}

function renderHero() { 
    const heroContainer = document.getElementById('hero-container'); 
    if (!heroContainer) return;
    if (allTracksData.length === 0 || allTracksData[0].avgScore === 0) { 
        heroContainer.innerHTML = `<div class="text-center text-gray-400 py-20 bg-white/5 rounded-3xl border border-white/10 neon-border"><p class="text-xl">Пока нет оценок.</p></div>`; 
        return; 
    } 
    const topTrack = allTracksData[0]; 
    const isPlayingThis = currentTrackId === topTrack.id && !globalAudio.paused; 
    const iconPath = isPlayingThis ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>` : `<path class="ml-1" d="M8 5v14l11-7z"/>`; 
    const topId = Number(topTrack.id); 
    
    heroContainer.innerHTML = `
        <div class="relative bg-gradient-to-br from-[#001f24] to-[#000000] p-6 md:p-10 rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col items-center text-center group mt-2 w-full max-w-4xl mx-auto pulse-neon">
            <div class="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
            <div class="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6 flex items-center gap-3 z-10 neon-text"><span>🏆</span> ТРЕК №1 <span>🏆</span></div>
            
            <div class="relative z-10 mb-8">
                <img src="${topTrack.cover_url ? escapeHtml(topTrack.cover_url) : 'https://via.placeholder.com/500?text=No+Cover'}" class="w-48 h-48 md:w-64 md:h-64 rounded-2xl object-cover shadow-[0_0_30px_rgba(6,182,212,0.4)] border-2 border-cyan-500/50 group-hover:scale-[1.03] transition-transform duration-500">
                <div class="absolute bottom-2 right-2 flex items-end gap-1 h-6 bg-black/80 px-2 py-1.5 rounded-lg border border-cyan-500/50">
                    <div class="eq-bar eq-anim-1"></div><div class="eq-bar eq-anim-2"></div><div class="eq-bar eq-anim-3"></div><div class="eq-bar eq-anim-4"></div>
                </div>
            </div>
            
            <h2 class="text-4xl md:text-6xl font-extrabold mb-2 tracking-tight z-10 line-clamp-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">${escapeHtml(topTrack.title)}</h2>
            <p class="text-lg text-gray-300 mb-8 z-10 font-medium tracking-wide">${escapeHtml(topTrack.artist || 'TrueEstimation')}</p>
            
            <div class="flex flex-col md:flex-row items-center justify-center gap-8 z-10 w-full">
                <div class="flex items-center gap-6 bg-black/60 px-6 py-3 rounded-2xl border border-white/10 neon-border">
                    <button onclick="playTrack(${topId})" class="w-14 h-14 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-black rounded-full transition-transform active:scale-95 shadow-xl hover:scale-110 neon-btn pulse-neon">
                        <svg class="w-7 h-7 card-play-icon card-icon-${topId}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                    </button>
                    <div class="text-left">
                        <div class="text-yellow-400 font-extrabold text-3xl neon-text">${topTrack.avgScore} <span class="text-sm text-gray-400 font-medium">/ 30</span></div>
                        <div class="text-xs text-gray-400 font-medium">${topTrack.votesCount} оценок</div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="openRatingModal(${topId})" class="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 rounded-2xl font-bold text-base transition-all active:scale-95 neon-btn">Оценить</button>
                    <button onclick="shareTrack(${topId}, event)" class="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-all active:scale-95 neon-btn" title="Поделиться">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `; 
}

function renderTracksList() {
    try {
        const container = document.getElementById('tracks-container'); 
        if(!container) return;
        let filteredTracks = allTracksData;
        if (currentCategory === 'Liked') filteredTracks = allTracksData.filter(t => t.userLiked);
        else if (currentCategory.startsWith('Playlist_')) {
            const plId = currentCategory.split('_')[1];
            const plTrackIds = allPlaylistTracksData.filter(pt => pt.playlist_id == plId).map(pt => pt.track_id);
            filteredTracks = allTracksData.filter(t => plTrackIds.includes(t.id));
        }
        else if (currentCategory !== 'Все') filteredTracks = allTracksData.filter(t => t.category === currentCategory);

        if (searchQuery) { filteredTracks = filteredTracks.filter(t => t.title.toLowerCase().includes(searchQuery) || (t.artist && t.artist.toLowerCase().includes(searchQuery))); }

        filteredTracks.sort((a, b) => { if (currentSort === 'newest') return new Date(b.created_at) - new Date(a.created_at); if (currentSort === 'popular') return b.votesCount - a.votesCount; if (currentSort === 'likes') return b.likesCount - a.likesCount; return b.avgScore - a.avgScore; });
        if (filteredTracks.length === 0) { container.innerHTML = `<p class="text-center text-gray-400 py-10">Ничего не найдено</p>`; return; }

        const htmlParts = filteredTracks.map(track => {
            const isPlayingThis = currentTrackId === track.id && !globalAudio.paused; const iconPath = isPlayingThis ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>` : `<path class="ml-0.5" d="M8 5v14l11-7z"/>`; const trackIdArg = Number(track.id);
            const heartIcon = track.userLiked ? `<svg class="w-4 h-4 md:w-5 md:h-5 text-red-500 fill-current drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` : `<svg class="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;
            const playlistIcon = `<svg class="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`;
            const shareIcon = `<svg class="w-4 h-4 md:w-5 md:h-5 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>`;

            return `<div class="group flex items-center p-2 rounded-xl hover:bg-white/10 transition-colors cursor-default border border-transparent hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]"><div class="w-8 md:w-10 shrink-0 flex items-center justify-center"><button onclick="playTrack(${trackIdArg})" class="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><svg class="w-4 h-4 md:w-6 md:h-6 card-play-icon card-icon-${trackIdArg}" fill="currentColor" viewBox="0 0 24 24">${iconPath}</svg></button></div><div class="w-10 md:w-12 shrink-0 pr-2">${track.cover_url ? `<img src="${escapeHtml(track.cover_url)}" class="w-8 h-8 md:w-10 md:h-10 rounded-md object-cover shadow-sm">` : `<div class="w-8 h-8 md:w-10 md:h-10 rounded-md bg-gray-800 flex items-center justify-center"><svg class="w-4 h-4 md:w-5 md:h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`}</div><div class="flex-1 min-w-0 pr-2 md:pr-4"><h2 class="text-xs md:text-sm font-bold truncate">${escapeHtml(track.title)}</h2><p class="text-[10px] md:text-xs text-gray-400 truncate">${escapeHtml(track.artist || 'TrueEstimation')}</p></div><div class="w-16 md:w-24 text-center shrink-0"><div class="text-yellow-400 font-bold text-xs md:text-sm">${track.avgScore > 0 ? track.avgScore : '-'} <span class="text-[9px] md:text-[10px] text-gray-500 font-medium">/30</span></div><div class="text-[9px] md:text-[10px] text-gray-500">${track.votesCount} оц.</div></div><div class="w-28 md:w-32 text-center shrink-0 flex justify-center items-center gap-1"><button onclick="likeTrack(${trackIdArg}, event)" class="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" title="Лайк">${heartIcon}</button><span class="text-[10px] md:text-xs font-bold ${track.userLiked ? 'text-red-500' : 'text-gray-400'} w-2 md:w-3 text-left">${track.likesCount > 0 ? track.likesCount : ''}</span><button onclick="openAddToPlaylistModal(${trackIdArg})" class="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ml-1" title="В плейлист">${playlistIcon}</button><button onclick="shareTrack(${trackIdArg}, event)" class="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors ml-1" title="Поделиться">${shareIcon}</button></div><div class="w-20 md:w-24 text-right shrink-0"><button onclick="openRatingModal(${trackIdArg})" class="bg-white/5 hover:bg-white/20 border border-white/10 px-2 md:px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all active:scale-95 opacity-0 group-hover:opacity-100 neon-btn">Оценить</button></div></div>`;
        });
        container.innerHTML = htmlParts.join('');
    } catch (err) {
        console.error("Tracks Render Error:", err);
    }
}

function renderAdminPanel() {
    const tbody = document.getElementById('admin-users-list'); 
    if(!tbody) return;
    const users = allProfilesData.filter(p => p.email); 
    
    if (users.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400">Не найдено</td></tr>`; return; }
    
    tbody.innerHTML = users.map(u => {
        const isTargetAdmin = u.is_admin;
        const actionBtn = isTargetAdmin ? `<button onclick="toggleAdminStatus('${u.id}', true)" class="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Снять</button>` : `<button onclick="toggleAdminStatus('${u.id}', false)" class="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Выдать</button>`;
        
        const isUrl = u.avatar_url && u.avatar_url.startsWith('http');
        const avatarHtml = isUrl ? `<img src="${escapeHtml(u.avatar_url)}" class="w-full h-full object-cover">` : `<span class="text-sm font-bold text-white" style="color: ${u.avatar_bg === '#ffffff' ? 'black' : 'white'}">${u.avatar_url || escapeHtml(u.username.charAt(0).toUpperCase())}</span>`;
        const bgStyle = isUrl ? '' : `background-color: ${u.avatar_bg || '#1e293b'}`;

        return `<tr class="border-b border-white/5 hover:bg-white/5 transition-colors"><td class="p-4 flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden" style="${bgStyle}">${avatarHtml}</div><span class="font-bold text-sm ${isTargetAdmin ? 'text-red-400' : 'text-white'}">${escapeHtml(u.username)}</span></td><td class="p-4 text-sm text-gray-400">${escapeHtml(u.email)}</td><td class="p-4 text-sm">${isTargetAdmin ? '<span class="text-red-500 font-bold">Админ</span>' : '<span class="text-gray-500">Юзер</span>'}</td><td class="p-4 text-right">${actionBtn}</td></tr>`;
    }).join('');
}

function renderCommentsView() {
    try {
        const container = document.getElementById('comments-list');
        if(!container) return;
        if (allCommentsData.length === 0) { 
            container.innerHTML = `<div class="relative overflow-hidden bg-gradient-to-br from-cyan-900/20 to-gray-900/60 rounded-3xl border border-cyan-500/20 p-12 text-center shadow-[0_0_30px_rgba(6,182,212,0.1)] w-full max-w-2xl neon-border"><div class="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div><p class="relative z-10 text-lg font-medium text-gray-300">${translations[currentLang].emptyComments}</p></div>`; return; 
        }
        const sortedComments = [...allCommentsData].sort((a, b) => { if (currentCommentsSort === 'newest') return new Date(b.created_at) - new Date(a.created_at); if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount; return new Date(b.created_at) - new Date(a.created_at); });
        const htmlParts = sortedComments.map(comment => {
            const dateStr = new Date(comment.created_at).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
            const heartIcon = comment.userLiked ? `<svg class="w-5 h-5 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` : `<svg class="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;
            const deleteBtn = comment.isOwn ? `<button onclick="promptDeleteComment(${comment.id})" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors ml-2" title="Удалить"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>` : '';
            const authorAdminBadge = comment.isAdmin ? `<span class="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded ml-2 font-bold shadow-[0_0_10px_rgba(239,68,68,0.5)]">ADMIN</span>` : '';
            
            const isCommentUrl = comment.avatar_url && comment.avatar_url.startsWith('http');
            const commentAvatarHtml = isCommentUrl ? `<img src="${escapeHtml(comment.avatar_url)}" class="w-full h-full object-cover">` : `<span class="text-sm md:text-lg font-bold text-white" style="color: ${comment.avatar_bg === '#ffffff' ? 'black' : 'white'}">${comment.avatar_url || escapeHtml(comment.username.charAt(0).toUpperCase())}</span>`;
            const commentBgStyle = isCommentUrl ? '' : `background-color: ${comment.avatar_bg || '#1e293b'}`;

            const repliesHtml = comment.replies.map(rep => {
                const repDate = new Date(rep.created_at).toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
                const repDeleteBtn = rep.isOwn ? `<button onclick="deleteReply(${rep.id})" class="text-gray-500 hover:text-red-400 ml-2 transition-colors" title="Удалить"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>` : '';
                const repHeart = rep.userLiked ? `<svg class="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` : `<svg class="w-4 h-4 text-gray-500 hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`;
                const repAdminBadge = rep.isAdmin ? `<span class="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded ml-2 font-bold shadow-[0_0_10px_rgba(239,68,68,0.5)]">ADMIN</span>` : '';
                
                const isRepUrl = rep.avatar_url && rep.avatar_url.startsWith('http');
                const repAvatarHtml = isRepUrl ? `<img src="${escapeHtml(rep.avatar_url)}" class="w-full h-full object-cover">` : `<span class="text-xs font-bold text-white" style="color: ${rep.avatar_bg === '#ffffff' ? 'black' : 'white'}">${rep.avatar_url || escapeHtml(rep.username.charAt(0).toUpperCase())}</span>`;
                const repBgStyle = isRepUrl ? '' : `background-color: ${rep.avatar_bg || '#1e293b'}`;

                return `<div class="bg-black/20 rounded-xl p-3 mt-2 border border-white/5 flex gap-3"><div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden" style="${repBgStyle}">${repAvatarHtml}</div><div class="flex-1"><div class="flex justify-between items-baseline mb-1"><div class="flex items-center"><span class="text-xs font-bold ${rep.isAdmin ? 'text-red-400' : 'text-cyan-400'}">${escapeHtml(rep.username)}</span>${repAdminBadge}</div><div class="flex items-center"><span class="text-[10px] text-gray-500 mr-2">${repDate}</span>${repDeleteBtn}</div></div><p class="text-sm text-gray-300 mb-1">${escapeHtml(rep.content)}</p><div class="flex items-center gap-3 mt-1"><button onclick="likeReply(${rep.id}, event)" class="flex items-center gap-1 hover:opacity-80">${repHeart}<span class="text-[11px] font-bold ${rep.userLiked ? 'text-red-500' : 'text-gray-400'}">${rep.likesCount > 0 ? rep.likesCount : ''}</span></button><button onclick="replyToUser(${comment.id}, '${escapeHtml(rep.username)}')" class="text-[11px] text-gray-500 hover:text-white transition-colors">Ответить</button></div></div></div>`;
            }).join('');
            return `<div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-4 transition-all hover:bg-white/10 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]"><div class="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10" style="${commentBgStyle}">${commentAvatarHtml}</div><div class="flex-1 min-w-0"><div class="flex justify-between items-start mb-1"><div><div class="flex items-center mb-1"><span class="text-sm font-bold ${comment.isAdmin ? 'text-red-400' : 'text-white'}">${escapeHtml(comment.username)}</span>${authorAdminBadge}<span class="text-[10px] text-gray-500 ml-2">${dateStr}</span></div><h4 class="text-xs text-gray-400 truncate cursor-pointer hover:underline hover:text-cyan-400" onclick="playTrack(${comment.track_id})">Трек: ${escapeHtml(comment.trackTitle)}</h4></div><div class="flex items-center">${deleteBtn}</div></div><p class="text-sm text-gray-200 leading-relaxed my-3">"${escapeHtml(comment.comment)}"</p><div class="flex items-center gap-3"><button onclick="likeComment(${comment.id}, event)" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all active:scale-95 group">${heartIcon}<span class="text-sm font-bold ${comment.userLiked ? 'text-red-500' : 'text-gray-400 group-hover:text-white'}">${comment.likesCount > 0 ? comment.likesCount : '0'}</span></button><div class="text-xs text-gray-400 bg-black/30 px-3 py-1.5 rounded-lg">Оценка: <span class="text-yellow-400 font-bold">${comment.score} / 30</span></div><button onclick="toggleReplyBox(${comment.id})" class="text-xs text-gray-400 hover:text-white transition-colors ml-2 font-medium">Ответить</button></div><div class="mt-2">${repliesHtml}</div><div id="reply-box-${comment.id}" class="hidden mt-3 flex gap-2"><input type="text" id="reply-input-${comment.id}" placeholder="Написать ответ..." class="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-500"><button onclick="submitReply(${comment.id})" class="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-1.5 rounded-lg text-sm font-bold transition-colors neon-btn">Отправить</button></div></div></div>`;
        });
        container.innerHTML = htmlParts.join('');
    } catch (err) {
        console.error("Comments Render Error:", err);
    }
}

// Инициализация громкости
updateVolumeUI();
