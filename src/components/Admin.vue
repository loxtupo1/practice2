<template>
  <div v-if="isAdmin" class="admin-container">
    <div class="admin-header">
      <h1>Панель администратора</h1>
      <p class="admin-subtitle">Управление платформой CYBERTOUR</p>
    </div>

    <div class="admin-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab" 
        :class="{ active: activeTab === tab }" 
        @click="activeTab = tab"
        class="tab-btn"
      >
        {{ 
          tab === 'tournaments' ? 'Турниры' : 
          tab === 'registrations' ? 'Заявки' : 
          tab === 'users' ? 'Пользователи' : 'Статистика' 
        }}
      </button>
    </div>

    <div v-if="activeTab === 'tournaments'" class="tab-content">
      <div class="section-header">
        <h2>Управление турнирами</h2>
        <button @click="showAddTournament = true" class="btn-add">+ Добавить турнир</button>
      </div>

      <div class="tournaments-list">
        <div v-if="loading" class="empty-state">Загрузка данных...</div>
        <div v-else-if="tournaments.length === 0" class="empty-state">Турниры не найдены</div>
        <div v-else class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Игра</th>
                <th>Призовой</th>
                <th>Участники</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tournaments" :key="t.id">
                <td>{{ t.name }}</td>
                <td>{{ t.game }}</td>
                <td>${{ t.prizePool?.toLocaleString() }}</td>
                <td>{{ t.registeredTeams || 0 }}/{{ t.maxTeams }}</td>
                <td>
                  <span :class="['status-badge', t.status || 'active']">
                    {{ getStatusText(t.status) }}
                  </span>
                </td>
                <td class="actions">
                  <button @click="editTournament(t)" class="btn-edit">Редактировать</button>
                  <button @click="deleteTournament(t.id)" class="btn-delete">Удалить</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'registrations'" class="tab-content">
      <div class="section-header">
        <h2>Заявки на участие</h2>
      </div>

      <div class="registrations-list">
        <div v-if="loading" class="empty-state">Загрузка заявок...</div>
        <div v-else-if="allRegistrations.length === 0" class="empty-state">Новых заявок пока нет</div>
        <div v-else class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Игрок</th>
                <th>Турнир</th>
                <th>Дата</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="reg in allRegistrations" :key="reg.id">
                <td>
                  <div class="user-cell">
                    <strong>{{ reg.userName || 'Аноним' }}</strong>
                    <small>ID: {{ reg.userId?.slice(0,8) }}</small>
                  </div>
                </td>
                <td>{{ reg.tournamentName }}</td>
                <td>{{ formatDate(reg.createdAt) }}</td>
                <td>
                  <span :class="['status-badge', reg.status]">
                    {{ reg.status === 'pending' ? 'Ожидает' : 'Одобрена' }}
                  </span>
                </td>
                <td>
                  <div class="actions">
                    <button 
                      v-if="reg.status === 'pending'"
                      @click="approveRegistration(reg)" 
                      class="btn-edit"
                      style="background: #28a745;"
                    >Одобрить</button>
                    <button @click="rejectRegistration(reg)" class="btn-delete">Удалить</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'users'" class="tab-content">
      <div class="section-header"><h2>Пользователи системы</h2></div>
      <div v-if="loading" class="empty-state">Загрузка...</div>
      <div v-else class="table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Роль</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.email }}</td>
              <td><span :class="['role-badge', user.role]">{{ user.role || 'user' }}</span></td>
              <td class="actions">
                <button @click="deleteUser(user.id)" class="btn-delete" :disabled="user.role === 'admin'">Удалить</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="activeTab === 'stats'" class="tab-content">
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Всего игроков</h3>
          <p class="stat-number">{{ users.length }}</p>
        </div>
        <div class="stat-card">
          <h3>Активных турниров</h3>
          <p class="stat-number">{{ tournaments.length }}</p>
        </div>
        <div class="stat-card">
          <h3>Всего заявок</h3>
          <p class="stat-number">{{ allRegistrations.length }}</p>
        </div>
      </div>
    </div>

    <div v-if="showAddTournament" class="modal-overlay" @click="showAddTournament = false">
      <div class="modal-content" @click.stop>
        <h3>Новый турнир</h3>
        <form @submit.prevent="addTournament" class="tournament-form">
          <input v-model="newTournament.name" placeholder="Название" required />
          <input v-model="newTournament.game" placeholder="Игра (CS2, Dota...)" required />
          <input v-model.number="newTournament.prizePool" type="number" placeholder="Призовой фонд" required />
          <input v-if="newTournament.status !== 'completed'" v-model.number="newTournament.maxTeams" type="number" placeholder="Макс. команд" required />
          <input v-model="newTournament.startDate" type="date" required />
          <select v-model="newTournament.status" class="status-select" required>
            <option value="active">Активный турнир</option>
            <option value="completed">Завершенный турнир</option>
          </select>
          <input v-if="newTournament.status === 'completed'" v-model="newTournament.winner" placeholder="Победитель" />
          <div class="form-actions">
            <button type="submit" class="btn-save">Создать</button>
            <button type="button" class="btn-cancel" @click="showAddTournament = false">Отмена</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditTournament" class="modal-overlay" @click="showEditTournament = false">
      <div class="modal-content" @click.stop>
        <h3>Редактировать турнир</h3>
        <form @submit.prevent="updateTournament" class="tournament-form">
          <input v-model="editingTournament.name" placeholder="Название" required />
          <input v-model="editingTournament.game" placeholder="Игра (CS2, Dota...)" required />
          <input v-model.number="editingTournament.prizePool" type="number" placeholder="Призовой фонд" required />
          <input v-if="editingTournament.status !== 'completed'" v-model.number="editingTournament.maxTeams" type="number" placeholder="Макс. команд" required />
          <input v-model="editingTournament.startDate" type="date" required />
          <select v-model="editingTournament.status" class="status-select">
            <option value="active">Активный</option>
            <option value="completed">Завершен</option>
          </select>
          <input v-if="editingTournament.status === 'completed'" v-model="editingTournament.winner" placeholder="Победитель" />
          <div class="form-actions">
            <button type="submit" class="btn-save">Сохранить</button>
            <button type="button" class="btn-cancel" @click="showEditTournament = false">Отмена</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <div v-else class="denied-container">
    <h2>403 - Доступ запрещен</h2>
    <p>У вас недостаточно прав для просмотра этой страницы.</p>
    <router-link to="/">Вернуться на главную</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { 
  collection, getDocs, doc, deleteDoc, addDoc, 
  updateDoc, query, orderBy, increment 
} from 'firebase/firestore';
import { db } from '../firebase';

const props = defineProps({
  isAdmin: [String, Boolean],
  isAuthenticated: Boolean,
  userId: String,
  userName: String
});

const loading = ref(true);
const activeTab = ref('tournaments');
const tabs = ['tournaments', 'registrations', 'users', 'stats'];

const tournaments = ref([]);
const users = ref([]);
const allRegistrations = ref([]);
const showAddTournament = ref(false);
const showEditTournament = ref(false);
const editingTournament = ref(null);

const newTournament = ref({
  name: '', game: '', prizePool: 0, maxTeams: 16, startDate: '', status: 'active', winner: ''
});

const loadData = async () => {
  if (!props.isAdmin) return;
  loading.value = true;
  try {
    const [tSnap, uSnap, rSnap] = await Promise.all([
      getDocs(collection(db, 'tournaments')),
      getDocs(collection(db, 'users')),
      getDocs(query(collection(db, 'registrations'), orderBy('createdAt', 'desc')))
    ]);
    
    tournaments.value = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    users.value = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    allRegistrations.value = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Ошибка загрузки данных:", e);
  } finally {
    loading.value = false;
  }
};

watch(() => props.isAdmin, (newVal) => {
  if (newVal) loadData();
}, { immediate: true });

const addTournament = async () => {
  try {
    loading.value = true;
    await addDoc(collection(db, "tournaments"), {
      ...newTournament.value,
      registeredTeams: 0,
      createdAt: new Date().toISOString()
    });
    showAddTournament.value = false;
    newTournament.value = { name: '', game: '', prizePool: 0, maxTeams: 16, startDate: '', status: 'active', winner: '' };
    await loadData();
    alert("Турнир создан!");
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    loading.value = false;
  }
};

const approveRegistration = async (reg) => {
  try {
    await updateDoc(doc(db, 'registrations', reg.id), { status: 'approved' });
    await loadData();
  } catch (e) {
    alert('Ошибка при обновлении');
  }
};

const rejectRegistration = async (reg) => {
  if (!confirm('Удалить заявку?')) return;
  try {
    await deleteDoc(doc(db, 'registrations', reg.id));
    if (reg.tournamentId) {
      await updateDoc(doc(db, 'tournaments', reg.tournamentId), {
        registeredTeams: increment(-1)
      });
    }
    await loadData();
  } catch (e) {
    alert('Ошибка при удалении');
  }
};

const deleteTournament = async (id) => {
  if (confirm('Удалить турнир?')) {
    await deleteDoc(doc(db, 'tournaments', id));
    await loadData();
  }
};

const editTournament = (tournament) => {
  editingTournament.value = { ...tournament };
  showEditTournament.value = true;
};

const updateTournament = async () => {
  try {
    loading.value = true;
    await updateDoc(doc(db, 'tournaments', editingTournament.value.id), {
      name: editingTournament.value.name,
      game: editingTournament.value.game,
      prizePool: editingTournament.value.prizePool,
      maxTeams: editingTournament.value.maxTeams,
      startDate: editingTournament.value.startDate,
      status: editingTournament.value.status,
      winner: editingTournament.value.winner || null
    });
    showEditTournament.value = false;
    editingTournament.value = null;
    await loadData();
    alert("Турнир обновлен!");
  } catch (error) {
    console.error("Ошибка:", error);
    alert("Ошибка при обновлении турнира");
  } finally {
    loading.value = false;
  }
};

const deleteUser = async (id) => {
  if (confirm('Удалить пользователя?')) {
    await deleteDoc(doc(db, 'users', id));
    await loadData();
  }
};

const formatDate = (date) => {
  if (!date) return '---';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString();
};

const getStatusText = (status) => {
  return status === 'completed' ? 'Завершен' : 'Активный';
};
</script>

<style scoped>
.admin-container { max-width: 1400px; margin: 0 auto; padding: 2rem; background: #0a0c0f; color: #e0e0e0; }
.admin-header { text-align: center; margin-bottom: 3rem; }
.admin-header h1 { color: #00ffff; font-size: 2.5rem; font-weight: 900; letter-spacing: 0.1rem; margin-bottom: 0.5rem; }
.admin-subtitle { color: #808080; font-size: 1rem; letter-spacing: 0.1rem; }
.admin-tabs { display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 2px solid #2a2e32; padding-bottom: 1rem; }
.tab-btn { padding: 0.8rem 1.5rem; background: transparent; border: 2px solid #2a2e32; color: #808080; font-weight: 600; letter-spacing: 0.1rem; cursor: pointer; transition: all 0.3s ease; border-radius: 4px; }
.tab-btn:hover { color: #00ffff; border-color: #00ffff; }
.tab-btn.active { background: #00ffff; color: #0a0c0f; border-color: #00ffff; }
.tab-content { background: #14181c; border: 1px solid #2a2e32; padding: 2rem; border-radius: 4px; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.section-header h2 { color: #00ffff; font-size: 1.5rem; }
.btn-add { padding: 0.8rem 1.5rem; background: #00ffff; color: #0a0c0f; border: none; font-weight: 600; cursor: pointer; border-radius: 4px; transition: all 0.3s ease; }
.btn-add:hover { background: #00d9d9; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: #14181c; border: 1px solid #2a2e32; padding: 2rem; border-radius: 4px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }
.modal-content h3 { color: #00ffff; margin-bottom: 1.5rem; font-size: 1.3rem; }
.tournament-form { display: flex; flex-direction: column; gap: 1rem; }
.tournament-form input { padding: 0.8rem; background: #0a0c0f; border: 1px solid #2a2e32; color: #e0e0e0; border-radius: 4px; font-size: 1rem; }
.form-actions { display: flex; gap: 1rem; margin-top: 1rem; }
.btn-save { flex: 1; padding: 0.8rem; background: #00ffff; color: #0a0c0f; border: none; font-weight: 600; cursor: pointer; border-radius: 4px; }
.btn-cancel { flex: 1; padding: 0.8rem; background: transparent; border: 1px solid #ff4444; color: #ff4444; font-weight: 600; cursor: pointer; border-radius: 4px; }
.table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
.admin-table thead { background: #0f1215; }
.admin-table th { padding: 1rem; text-align: left; color: #00ffff; font-weight: 600; border-bottom: 2px solid #2a2e32; }
.admin-table td { padding: 1rem; border-bottom: 1px solid #2a2e32; color: #e0e0e0; }
.admin-table tbody tr:hover { background: #0f1215; }
.actions { display: flex; gap: 0.5rem; }
.btn-edit, .btn-delete { padding: 0.5rem 1rem; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; font-size: 0.85rem; }
.btn-edit { background: #0088ff; color: white; }
.btn-delete { background: #ff4444; color: white; }
.empty-state { text-align: center; padding: 3rem; color: #808080; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-top: 2rem; }
.stat-card { background: #0f1215; border: 1px solid #2a2e32; padding: 2rem; border-radius: 4px; text-align: center; }
.stat-card h3 { color: #b0b0b0; font-size: 0.95rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.1rem; }
.stat-number { color: #00ffff; font-size: 2.5rem; font-weight: 900; text-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
.status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
.status-badge.pending { background: rgba(255, 165, 0, 0.2); color: orange; }
.status-badge.approved { background: rgba(40, 167, 69, 0.2); color: #28a745; }
.status-badge.active { background: rgba(0, 255, 0, 0.2); color: #00ff00; }
.status-badge.completed { background: rgba(255, 165, 0, 0.2); color: #ffa500; }

.status-select {
  padding: 0.8rem;
  background: #0a0c0f;
  border: 1px solid #2a2e32;
  color: #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
}
.user-cell { display: flex; flex-direction: column; }
.user-cell small { color: #666; font-size: 0.75rem; }

@media (max-width: 768px) {
  .admin-container { padding: 1rem; }
  .admin-header h1 { font-size: 1.8rem; }
  .admin-tabs { flex-direction: column; }
  .table-wrapper { font-size: 0.85rem; }
  .actions { flex-direction: column; }
  .stats-grid { grid-template-columns: 1fr; }

  .tab-btn {
    padding: 0.6rem 1rem;
    font-size: 0.9rem;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .section-header h2 {
    font-size: 1.3rem;
  }

  .btn-add {
    width: 100%;
    text-align: center;
  }

  .admin-table {
    font-size: 0.8rem;
  }

  .admin-table th,
  .admin-table td {
    padding: 0.5rem;
  }

  .modal-content {
    width: 95%;
    max-width: none;
    margin: 1rem;
    padding: 1.5rem;
  }

  .tournament-form {
    gap: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-save,
  .btn-cancel {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .admin-container {
    padding: 0.5rem;
  }

  .admin-header {
    text-align: center;
  }

  .admin-header h1 {
    font-size: 1.5rem;
  }

  .admin-subtitle {
    font-size: 0.9rem;
  }

  .admin-tabs {
    gap: 0.5rem;
  }

  .tab-btn {
    padding: 0.5rem 0.8rem;
    font-size: 0.8rem;
  }

  .section-header h2 {
    font-size: 1.2rem;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .admin-table {
    min-width: 600px;
    font-size: 0.7rem;
  }

  .modal-content {
    width: 98%;
    padding: 1rem;
  }

  .modal-content h3 {
    font-size: 1.2rem;
  }

  .tournament-form input,
  .tournament-form select {
    padding: 0.6rem;
    font-size: 0.9rem;
  }
}
</style>