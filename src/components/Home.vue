<template>
  <div class="home-container">
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">CYBERTOUR</h1>
        <p class="hero-subtitle">Платформа для киберспортивных турниров</p>
        
        <div v-if="!isAuthenticated" class="hero-buttons">
          <router-link to="/register" class="btn btn-primary">ПРИСОЕДИНИТЬСЯ</router-link>
        </div>
        <div v-else class="welcome-message">
          <h2>С возвращением, {{ userName || userEmail }}!</h2>
          <p>Готовы к новым победам?</p>
        </div>
      </div>
    </div>

    <div class="tournaments-section">
      <div class="section-header">
        <h2 class="section-title">Активные турниры</h2>
        <span class="section-badge">LIVE</span>
      </div>

      <!-- Поиск и фильтры -->
      <div class="filters-container">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Поиск турниров..."
            class="search-input"
          />
        </div>
        <div class="filter-controls">
          <select v-model="selectedGame" class="filter-select">
            <option value="">Все игры</option>
            <option value="CS2">CS2</option>
            <option value="Dota 2">DOTA 2</option>
            <option value="Valorant">VALORANT</option>
            <option value="League of Legends">League of Legends</option>
          </select>
          <select v-model="sortBy" class="filter-select">
            <option value="newest">Новее</option>
            <option value="prize-high">Призовой ↓</option>
            <option value="prize-low">Призовой ↑</option>
          </select>
        </div>
      </div>
      
      <div class="tournaments-grid">
        <TournamentCard
          v-for="tournament in displayedTournaments"
          :key="tournament.id"
          :tournament="tournament"
          :is-authenticated="isAuthenticated"
          :user-id="userId"
          :user-name="userName"
          @registered="loadTournaments"
        />
      </div>

      <div v-if="displayedTournaments.length === 0" class="empty-state">
        <p>Турниры не найдены. Попробуйте изменить фильтры.</p>
      </div>

      <div v-if="loading" class="loading">Загрузка турниров...</div>

      <div v-if="hasMoreTournaments" class="load-more-container">
        <button @click="loadMore" class="btn-load-more">
          Показать еще турниры
        </button>
      </div>
    </div>

    <div class="past-tournaments-section">
      <div class="section-header">
        <h2 class="section-title">Прошедшие турниры</h2>
        <span class="section-badge">COMPLETED</span>
      </div>

      <div class="tournaments-grid">
        <div v-for="tournament in pastTournaments" :key="tournament.id" class="tournament-card past-card">
          <div class="tournament-header">
            <h3 class="tournament-name">{{ tournament.name }}</h3>
            <span class="game-tag">{{ tournament.game }}</span>
          </div>
          <div class="tournament-info">
            <div class="prize-info">
              <span class="prize-label">Призовой фонд:</span>
              <span class="prize-amount">${{ tournament.prizePool.toLocaleString() }}</span>
            </div>
            <div class="winner-info">
              <span class="winner-label">Победитель:</span>
              <span class="winner-name">{{ tournament.winner }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="pastTournaments.length === 0" class="empty-state">
        <p>Прошедших турниров пока нет.</p>
      </div>
    </div>

    <div class="features-section">
      <h2 class="section-title">Почему выбирают нас</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-number">01</div>
          <h3>LAN финалы</h3>
          <p>Лучшие команды встречаются на LAN турнирах с полным покрытием расходов</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-number">02</div>
          <h3>Профессиональная трансляция</h3>
          <p>Все матчи транслируются с профессиональными комментаторами</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-number">03</div>
          <h3>Рейтинговая система</h3>
          <p>Поднимайтесь в рейтинге и получайте инвайты на закрытые турниры</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-number">04</div>
          <h3>Anti-Cheat защита</h3>
          <p>Многоуровневая система защиты от нечестной игры</p>
        </div>
      </div>
    </div>

    <div class="prize-section">
      <div class="prize-content">
        <h2>СЕЗОН 2026</h2>
        <div class="prize-amount">$500,000</div>
        <p>Общий призовой фонд сезона</p>
        <router-link v-if="!isAuthenticated" to="/register" class="btn btn-primary btn-large">ПРИНЯТЬ УЧАСТИЕ</router-link>
        <router-link v-else to="/profile" class="btn btn-primary btn-large">МОЙ ПРОФИЛЬ</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { collection, onSnapshot, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import TournamentCard from './TournamentCard.vue';

const props = defineProps({
  isAuthenticated: { type: Boolean, default: false },
  userName: { type: String, default: '' },
  userEmail: { type: String, default: '' },
  userId: { type: String, default: '' }
});

const tournaments = ref([]);
const displayedCount = ref(15);
const loading = ref(true);
const searchQuery = ref('');
const selectedGame = ref('');
const sortBy = ref('newest');
let unsubscribe = null;

const filteredTournaments = computed(() => {
  let result = tournaments.value.filter(t => t.status === 'active');

  if (selectedGame.value) {
    result = result.filter(t => t.game === selectedGame.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(t => 
      t.name.toLowerCase().includes(query) || 
      (t.description && t.description.toLowerCase().includes(query))
    );
  }

  if (sortBy.value === 'prize-high') {
    result.sort((a, b) => (b.prizePool || 0) - (a.prizePool || 0));
  } else if (sortBy.value === 'prize-low') {
    result.sort((a, b) => (a.prizePool || 0) - (b.prizePool || 0));
  } else if (sortBy.value === 'newest') {
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return result;
});

const displayedTournaments = computed(() => {
  return filteredTournaments.value.slice(0, displayedCount.value);
});

const hasMoreTournaments = computed(() => {
  return displayedCount.value < filteredTournaments.value.length;
});

const pastTournaments = computed(() => {
  let result = tournaments.value.filter(t => t.status === 'completed');

  if (selectedGame.value) {
    result = result.filter(t => t.game === selectedGame.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(t =>
      t.name.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return result;
});

const loadMore = () => {
  displayedCount.value += 10;
};

const setupRealtimeListener = () => {
  try {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    
    unsubscribe = onSnapshot(q, (querySnapshot) => {
      tournaments.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      loading.value = false;
    }, (error) => {
      console.error('Ошибка подписки:', error);
      tournaments.value = [];
      loading.value = false;
    });
  } catch (error) {
    console.error('Ошибка при инициализации:', error);
    tournaments.value = [];
    loading.value = false;
  }
};

onMounted(() => {
  setupRealtimeListener();
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<style scoped>
.home-container {
  max-width: 1400px;
  margin: 0 auto;
  background: #0a0c0f;
  color: #e0e0e0;
}

.hero-section {
  position: relative;
  min-height: 80vh;
  background-image: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), 
                    url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 4rem;
}

.hero-content {
  position: relative;
  z-index: 2;
  padding: 2rem;
}

.hero-title {
  font-size: 5rem;
  font-weight: 900;
  letter-spacing: 0.5rem;
  margin-bottom: 1rem;
  color: #fff;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  animation: glitch 1s infinite;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #b0b0b0;
  margin-bottom: 3rem;
  letter-spacing: 0.2rem;
}

.welcome-message h2 {
  color: #00ffff;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.welcome-message p {
  color: #b0b0b0;
  font-size: 1.2rem;
}

.hero-buttons {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.btn {
  padding: 1rem 2.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  font-size: 0.9rem;
  letter-spacing: 0.1rem;
  display: inline-block;
}

.btn-primary {
  background: #00ffff;
  color: #0a0c0f;
  border: 2px solid #00ffff;
}

.btn-primary:hover {
  background: transparent;
  color: #00ffff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
}

.tournaments-section {
  padding: 4rem 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 3rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 600;
  color: #fff;
}

.section-badge {
  background: #ff0000;
  color: #fff;
  padding: 0.2rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.1rem;
  animation: pulse 2s infinite;
}

.tournaments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #808080;
  font-size: 1.2rem;
}

.features-section {
  padding: 6rem 2rem;
  background: #0f1215;
  text-align: center;
  margin-top: 4rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 3rem;
  margin-top: 4rem;
}

.feature-card {
  text-align: left;
  padding: 2rem;
  background: #14181c;
  border: 1px solid #2a2e32;
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: #00ffff;
  transform: translateY(-5px);
}

.feature-number {
  font-size: 3rem;
  font-weight: 900;
  color: #2a2e32;
  margin-bottom: 1rem;
}

.feature-card h3 {
  color: #fff;
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: #808080;
  line-height: 1.6;
}

.prize-section {
  margin: 4rem 0;
  padding: 6rem 2rem;
  background: linear-gradient(135deg, #0a0c0f 0%, #1a1e22 100%);
  border: 1px solid #2a2e32;
  text-align: center;
}

.prize-content h2 {
  color: #808080;
  font-size: 1.2rem;
  letter-spacing: 0.3rem;
  margin-bottom: 1rem;
}

.prize-amount {
  font-size: 5rem;
  font-weight: 900;
  color: #00ffff;
  text-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
  margin-bottom: 1rem;
}

.prize-content p {
  color: #b0b0b0;
  margin-bottom: 2rem;
}

.btn-large {
  padding: 1.2rem 4rem;
  font-size: 1.1rem;
}

/* Фильтры и поиск */
.filters-container {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 0 2rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-box {
  flex: 1;
  min-width: 250px;
}

.search-input {
  width: 100%;
  padding: 0.8rem 1.5rem;
  background: #14181c;
  border: 1px solid #2a2e32;
  color: #e0e0e0;
  font-size: 0.95rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #00ffff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.filter-controls {
  display: flex;
  gap: 1rem;
}

.filter-select {
  padding: 0.8rem 1rem;
  background: #14181c;
  border: 1px solid #2a2e32;
  color: #e0e0e0;
  font-size: 0.95rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 150px;
}

.filter-select:hover,
.filter-select:focus {
  border-color: #00ffff;
  outline: none;
}

/* Пагинация */
.load-more-container {
  text-align: center;
  margin-top: 3rem;
  padding: 2rem;
}

.btn-load-more {
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, #00ffff 0%, #0088ff 100%);
  color: #000;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.1rem;
}

.btn-load-more:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
}

.btn-load-more:active {
  transform: scale(0.98);
}

.past-tournaments-section {
  padding: 4rem 2rem;
  background: #0f1215;
  margin-top: 4rem;
}

.past-card {
  background: #14181c;
  border: 1px solid #2a2e32;
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;
  opacity: 0.8;
}

.past-card:hover {
  border-color: #444;
  transform: translateY(-2px);
}

.tournament-header {
  margin-bottom: 1.5rem;
}

.tournament-name {
  color: #fff;
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
}

.game-tag {
  color: #808080;
  font-size: 0.9rem;
  background: #2a2e32;
  padding: 0.2rem 0.8rem;
  border-radius: 4px;
}

.tournament-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.prize-info, .winner-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prize-label, .winner-label {
  color: #808080;
  font-size: 0.9rem;
}

.prize-amount {
  color: #00ffff;
  font-weight: bold;
  font-size: 1.1rem;
}

.winner-name {
  color: #ffa500;
  font-weight: bold;
  font-size: 1.1rem;
}

@keyframes glitch {
  0% {
    text-shadow: 0.05em 0 0 rgba(255, 0, 0, 0.75),
                -0.05em -0.025em 0 rgba(0, 255, 255, 0.75);
  }
  14% {
    text-shadow: 0.05em 0 0 rgba(255, 0, 0, 0.75),
                -0.05em -0.025em 0 rgba(0, 255, 255, 0.75);
  }
  15% {
    text-shadow: -0.05em -0.025em 0 rgba(255, 0, 0, 0.75),
                0.025em 0.05em 0 rgba(0, 255, 255, 0.75);
  }
  49% {
    text-shadow: -0.05em -0.025em 0 rgba(255, 0, 0, 0.75),
                0.025em 0.05em 0 rgba(0, 255, 255, 0.75);
  }
  50% {
    text-shadow: 0.025em 0.05em 0 rgba(255, 0, 0, 0.75),
                0.05em 0 0 rgba(0, 255, 255, 0.75);
  }
  99% {
    text-shadow: 0.025em 0.05em 0 rgba(255, 0, 0, 0.75),
                0.05em 0 0 rgba(0, 255, 255, 0.75);
  }
  100% {
    text-shadow: -0.025em 0 0 rgba(255, 0, 0, 0.75),
                -0.025em -0.025em 0 rgba(0, 255, 255, 0.75);
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
    letter-spacing: 0.2rem;
  }

  .hero-buttons {
    flex-direction: column;
    align-items: center;
  }

  .btn {
    width: 100%;
    max-width: 300px;
    text-align: center;
  }

  .tournaments-grid {
    grid-template-columns: 1fr;
  }

  .prize-amount {
    font-size: 3rem;
  }

  .hero-section {
    padding: 2rem 1rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .tournaments-section {
    padding: 2rem 1rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .features-section {
    padding: 3rem 1rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .feature-card {
    padding: 1.5rem;
  }

  .prize-section {
    padding: 3rem 1rem;
  }

  .past-tournaments-section {
    padding: 2rem 1rem;
  }

  .filters-container {
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem;
  }

  .filter-controls {
    width: 100%;
    justify-content: space-between;
  }

  .filter-select {
    flex: 1;
    min-width: 120px;
  }

  .search-box {
    width: 100%;
  }

  .past-card {
    padding: 1.5rem;
  }

  .tournament-info {
    gap: 0.8rem;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 1.5rem 0.5rem;
    min-height: 60vh;
  }

  .hero-title {
    font-size: 2rem;
    letter-spacing: 0.1rem;
  }

  .hero-subtitle {
    font-size: 0.9rem;
  }

  .btn {
    max-width: 250px;
    padding: 0.8rem 1.5rem;
    font-size: 0.9rem;
  }

  .tournaments-section {
    padding: 2rem 0.5rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .features-section {
    padding: 2rem 0.5rem;
  }

  .features-grid {
    gap: 1.5rem;
  }

  .feature-card {
    padding: 1rem;
  }

  .feature-number {
    font-size: 2rem;
  }

  .feature-card h3 {
    font-size: 1.1rem;
  }

  .prize-section {
    padding: 2rem 0.5rem;
  }

  .prize-amount {
    font-size: 2.5rem;
  }

  .past-tournaments-section {
    padding: 2rem 0.5rem;
  }

  .filters-container {
    padding: 0 0.5rem;
  }

  .filter-controls {
    flex-direction: column;
    gap: 0.8rem;
  }

  .filter-select {
    width: 100%;
    min-width: unset;
  }

  .past-card {
    padding: 1rem;
  }

  .tournament-name {
    font-size: 1.1rem;
  }

  .game-tag {
    font-size: 0.8rem;
  }

  .prize-label, .winner-label {
    font-size: 0.8rem;
  }

  .prize-amount, .winner-name {
    font-size: 1rem;
  }
}

@media (max-width: 360px) {
  .hero-title {
    font-size: 1.8rem;
    letter-spacing: 0.05rem;
  }

  .hero-subtitle {
    font-size: 0.8rem;
  }

  .welcome-message h2 {
    font-size: 1.8rem;
  }

  .welcome-message p {
    font-size: 0.9rem;
  }

  .btn {
    max-width: 200px;
    padding: 0.7rem 1rem;
    font-size: 0.8rem;
  }

  .section-title {
    font-size: 1.3rem;
  }

  .feature-card h3 {
    font-size: 1rem;
  }

  .feature-card p {
    font-size: 0.9rem;
  }

  .prize-amount {
    font-size: 2rem;
  }

  .prize-content h2 {
    font-size: 1rem;
  }

  .prize-content p {
    font-size: 0.9rem;
  }

  .past-card {
    padding: 0.8rem;
  }

  .tournament-name {
    font-size: 1rem;
  }
}
</style>