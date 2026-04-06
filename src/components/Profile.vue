<template>
  <div class="profile-container">
    <div class="profile-header">
      <div class="profile-main-info">
        <div class="avatar">{{ userInitials }}</div>
        <div class="details">
          <div v-if="!isEditing" class="name-display">
            <h1>{{ userName || 'Боец' }}</h1>
            <button @click="startEditing" class="btn-edit-inline">⚙️ Изменить имя</button>
          </div>
          
          <div v-else class="name-edit-form">
            <input 
              v-model="editName" 
              type="text" 
              class="edit-input" 
              placeholder="Введите новое имя"
              @keyup.enter="saveName"
            />
            <div class="edit-actions">
              <button @click="saveName" class="btn-save-small" :disabled="saving">Сохранить</button>
              <button @click="isEditing = false" class="btn-cancel-small">Отмена</button>
            </div>
          </div>
          <p class="user-email">{{ userEmail }}</p>
        </div>
      </div>
    </div>

    <div class="profile-content">
      <h3>Мои турниры</h3>
      <div v-if="loading" class="loading">Загрузка ваших заявок...</div>
      
      <div v-else-if="registrations.length === 0" class="empty-state">
        <p>Вы еще не записались ни на один турнир.</p>
        <router-link to="/" class="btn-link">Найти турнир</router-link>
      </div>

      <div v-else class="reg-list">
        <div v-for="reg in registrations" :key="reg.id" class="reg-card">
          <div class="reg-info">
            <h4>{{ reg.tournamentName }}</h4>
            <span class="game-tag">{{ reg.game }}</span>
          </div>
          <div class="reg-status" :class="reg.status">
            {{ reg.status === 'pending' ? 'На рассмотрении' : 'Подтвержден' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const props = defineProps({
  userId: String,
  userEmail: String,
  userName: String
});

const registrations = ref([]);
const loading = ref(true);
const isEditing = ref(false);
const editName = ref('');
const saving = ref(false);

const userInitials = computed(() => {
  return props.userName ? props.userName.charAt(0).toUpperCase() : '?';
});

const startEditing = () => {
  editName.value = props.userName;
  isEditing.value = true;
};

const saveName = async () => {
  if (!editName.value.trim() || editName.value === props.userName) {
    isEditing.value = false;
    return;
  }

  saving.value = true;
  try {
    const userRef = doc(db, 'users', props.userId);
    await updateDoc(userRef, {
      displayName: editName.value
    });
    
    window.location.reload(); 
  } catch (e) {
    console.error("Ошибка при сохранении имени:", e);
    alert("Не удалось сохранить имя.");
  } finally {
    saving.value = false;
    isEditing.value = false;
  }
};

const loadMyRegistrations = async () => {
  if (!props.userId) return;
  loading.value = true;
  try {
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', props.userId)
    );
    const snap = await getDocs(q);
    registrations.value = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Ошибка загрузки регистраций:", e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (props.userId) loadMyRegistrations();
});

watch(() => props.userId, (newId) => {
  if (newId) loadMyRegistrations();
});
</script>

<style scoped>
.profile-container { max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: white; }
.profile-header { background: #14181c; padding: 2rem; border-radius: 12px; border: 1px solid #2a2e32; }
.profile-main-info { display: flex; align-items: center; gap: 2rem; }

.avatar { 
  width: 100px; height: 100px; background: #00ffff; color: #000; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 2.5rem; font-weight: bold; border-radius: 50%;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
}

.details h1 { margin: 0; font-size: 2rem; }
.user-email { color: #808080; margin-top: 0.5rem; }

.name-display { display: flex; align-items: center; gap: 1rem; }
.btn-edit-inline { 
  background: none; border: 1px solid #333; color: #808080; 
  padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;
}
.btn-edit-inline:hover { border-color: #00ffff; color: #00ffff; }

.avatar-actions { margin-top: 1rem; }

.name-edit-form { display: flex; flex-direction: column; gap: 10px; }
.edit-input { 
  background: #0a0c0f; border: 1px solid #00ffff; color: white; 
  padding: 8px; border-radius: 4px; font-size: 1.2rem;
}
.edit-actions { display: flex; gap: 10px; }
.btn-save-small { background: #00ffff; color: black; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.btn-cancel-small { background: none; border: 1px solid #ff4444; color: #ff4444; padding: 5px 15px; border-radius: 4px; cursor: pointer; }

.profile-content { margin-top: 3rem; }
.reg-list { display: grid; gap: 1rem; margin-top: 1rem; }
.reg-card { 
  background: #14181c; padding: 1.5rem; border-radius: 8px; 
  border-left: 4px solid #00ffff; display: flex; justify-content: space-between; align-items: center; 
}
.game-tag { color: #808080; font-size: 0.9rem; }
.reg-status.pending { color: #ffa500; }
.btn-link { color: #00ffff; text-decoration: none; }

@media (max-width: 768px) {
  .profile-container {
    margin: 1rem auto;
    padding: 0 0.5rem;
  }

  .profile-header {
    padding: 1.5rem;
  }

  .profile-main-info {
    flex-direction: column;
    text-align: center;
    gap: 1.5rem;
  }

  .avatar {
    width: 80px;
    height: 80px;
    font-size: 2rem;
  }

  .details h1 {
    font-size: 1.5rem;
  }

  .name-display {
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-edit-inline {
    font-size: 0.7rem;
    padding: 3px 8px;
  }

  .reg-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .reg-info h4 {
    margin: 0 0 0.5rem 0;
  }
}

@media (max-width: 480px) {
  .profile-container {
    margin: 0.5rem auto;
  }

  .profile-header {
    padding: 1rem;
  }

  .avatar {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }

  .details h1 {
    font-size: 1.2rem;
  }

  .user-email {
    font-size: 0.9rem;
  }

  .reg-card {
    padding: 1rem;
  }
}

@media (max-width: 360px) {
  .profile-container {
    margin: 0.3rem auto;
    padding: 0 0.5rem;
  }

  .profile-header {
    padding: 0.8rem;
    flex-direction: column;
    text-align: center;
  }

  .avatar {
    width: 50px;
    height: 50px;
    font-size: 1.2rem;
  }

  .details h1 {
    font-size: 1.1rem;
  }

  .user-email {
    font-size: 0.8rem;
  }

  .reg-card {
    padding: 0.8rem;
  }

  .reg-card h3 {
    font-size: 1rem;
  }

  .reg-card p {
    font-size: 0.8rem;
  }
}
</style>